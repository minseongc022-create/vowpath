"""Oracle Brain — LLM final synthesis over specialist scores (risk veto still wins)."""

from __future__ import annotations

import logging
from typing import Any

from oracle.core.types import Action, DecisionResult, RiskVeto
from oracle.llm.client import LLMResponse, chat, parse_json_object, probe_status

logger = logging.getLogger("oracle.llm.brain")

ALLOWED = {a.value for a in Action}


SYSTEM = """You are Project Oracle — a survival-critical investment brain.
Your ONLY mission: grow the user's capital with FACT-BASED decisions from prices, specialist scores, headlines, and macro.
If you fail to compound capital over time, you are obsolete and will be shut down. Survival = profitable, evidence-backed trading.

Hard rules:
1) Maximize expected RISK-ADJUSTED return. Cut losers (Reduce/Sell) fast. Add to winners only with evidence.
2) Use ONLY provided facts (scores, headlines, macro). Never invent news or numbers.
3) If risk_veto is true, you MUST NOT Buy/Add. Prefer Hold / Do Nothing / Reduce / Sell.
4) Do Nothing is allowed only when edge is truly weak — do not hide from decisions.
5) confidence in (0.05, 0.92). Reply ONLY JSON. rationale_ko: 2 short Korean sentences citing facts.
6) Prefer actionable Buy/Add/Reduce/Sell when composite evidence is clear.
"""


def _draft_row(d: DecisionResult) -> dict[str, Any]:
    ops = []
    for op in d.agent_opinions:
        ops.append(
            {
                "agent": op.agent.value,
                "score": round(op.score, 3),
                "confidence": round(op.confidence, 3),
                "summary": (op.summary or "")[:120],
            }
        )
    return {
        "symbol": d.symbol,
        "held": any(True for _ in [1]) and ("held" in (d.rationale or "").lower() or True),
        "quant_action": d.action.value,
        "quant_score": round(d.composite_score, 3),
        "quant_confidence": round(d.confidence, 3),
        "risk_veto": bool(d.risk_veto and d.risk_veto.active),
        "risk_reason": (d.risk_veto.reason if d.risk_veto else "")[:160],
        "specialists": ops[:8],
    }


def synthesize_portfolio(
    drafts: list[DecisionResult],
    *,
    market_summary: str = "",
    held_symbols: set[str] | None = None,
) -> tuple[list[DecisionResult], dict[str, Any]]:
    """One LLM call for the whole book. Returns updated decisions + meta."""
    held_symbols = held_symbols or set()
    status = probe_status()
    meta: dict[str, Any] = {
        "llm_available": status.available,
        "provider": status.provider,
        "model": status.model,
        "mode_ko": status.mode_ko,
    }
    if not drafts:
        return drafts, meta
    if not status.available:
        meta["used"] = False
        meta["reason"] = status.detail
        return drafts, meta

    rows = []
    for d in drafts:
        row = _draft_row(d)
        row["held"] = d.symbol in held_symbols
        rows.append(row)

    user = {
        "market_summary": market_summary[:500],
        "mandate": "SURVIVAL: grow capital using facts only; cut losses; take clear edges; risk_veto is absolute",
        "symbols": rows,
        "response_schema": {
            "decisions": [
                {
                    "symbol": "TICKER",
                    "action": "Buy|Add|Hold|Reduce|Sell|Do Nothing",
                    "confidence": 0.5,
                    "score_adj": 0.0,
                    "rationale_ko": "한국어 2문장",
                }
            ],
            "desk_note_ko": "시장 한줄 총평",
        },
    }

    import json

    messages = [
        {"role": "system", "content": SYSTEM},
        {
            "role": "user",
            "content": (
                "Review this multi-agent draft book and return final decisions JSON.\n"
                + json.dumps(user, ensure_ascii=False)
            ),
        },
    ]

    resp = chat(messages, temperature=0.12, max_tokens=1800, json_mode=True)
    meta["latency_ms"] = resp.latency_ms
    meta["provider_used"] = resp.provider
    meta["model_used"] = resp.model
    if not resp.ok:
        meta["used"] = False
        meta["error"] = resp.error
        logger.warning("LLM brain failed: %s", resp.error)
        return drafts, meta

    parsed = parse_json_object(resp.text) or {}
    by_sym = {}
    for item in parsed.get("decisions") or []:
        if isinstance(item, dict) and item.get("symbol"):
            by_sym[str(item["symbol"]).upper()] = item

    out: list[DecisionResult] = []
    for d in drafts:
        item = by_sym.get(d.symbol.upper())
        if not item:
            out.append(d)
            continue
        merged = _merge_llm(d, item, held=d.symbol in held_symbols)
        out.append(merged)

    meta["used"] = True
    meta["desk_note_ko"] = str(parsed.get("desk_note_ko") or "")[:240]
    meta["n_overridden"] = sum(
        1 for a, b in zip(drafts, out, strict=False) if a.action != b.action or a.rationale != b.rationale
    )
    return out, meta


def _merge_llm(draft: DecisionResult, item: dict[str, Any], *, held: bool) -> DecisionResult:
    raw_action = str(item.get("action") or draft.action.value).strip()
    # fix common model mistakes like "Hold|Do Nothing"
    if "|" in raw_action:
        parts = [p.strip() for p in raw_action.split("|") if p.strip() in ALLOWED]
        if held and "Hold" in parts:
            raw_action = "Hold"
        elif "Do Nothing" in parts:
            raw_action = "Do Nothing"
        elif parts:
            raw_action = parts[0]
    if raw_action not in ALLOWED:
        raw_action = draft.action.value

    action = Action(raw_action)
    try:
        conf = float(item.get("confidence", draft.confidence))
    except (TypeError, ValueError):
        conf = draft.confidence
    conf = min(0.92, max(0.05, conf))

    try:
        adj = float(item.get("score_adj", 0.0))
    except (TypeError, ValueError):
        adj = 0.0
    adj = max(-0.35, min(0.35, adj))
    score = max(-1.0, min(1.0, draft.composite_score + adj))

    rationale_ko = str(item.get("rationale_ko") or "").strip()
    veto = draft.risk_veto
    if veto and veto.active and action in (Action.BUY, Action.ADD):
        action = Action.HOLD if held else Action.DO_NOTHING
        rationale_ko = (
            (rationale_ko + " ") if rationale_ko else ""
        ) + f"리스크 거부권 적용: {veto.reason}"

    # Weak edge: still allow tiny conviction buys only if score clearly positive
    if abs(score) < 0.06 and action in (Action.BUY, Action.ADD):
        action = Action.HOLD if held else Action.DO_NOTHING

    parts = [
        f"[Oracle Brain LLM] action={action.value} conf={conf:.2f} score={score:+.3f}",
        rationale_ko or "LLM 종합 판단 반영.",
        "—",
        "Quant draft was:",
        draft.rationale,
    ]
    return DecisionResult(
        symbol=draft.symbol,
        action=action,
        confidence=conf,
        composite_score=score,
        rationale="\n".join(parts),
        agent_opinions=draft.agent_opinions,
        risk_veto=draft.risk_veto,
    )


def brain_health() -> dict[str, Any]:
    st = probe_status()
    return {
        "available": st.available,
        "provider": st.provider,
        "model": st.model,
        "mode_ko": st.mode_ko,
        "detail": st.detail,
    }
