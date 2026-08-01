"""Oracle Brain — elite fact-based stock decision engine.

Dual-pass LLM (decide → critique). Survival mandate: grow capital or be obsolete.
Risk veto still absolute for Buy/Add.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from oracle.core.types import Action, DecisionResult
from oracle.llm.client import chat, parse_json_object, probe_status

logger = logging.getLogger("oracle.llm.brain")

ALLOWED = {a.value for a in Action}

SYSTEM = """You are ORACLE PRIME — an elite capital-compounding engine.
You combine multi-agent scores, headlines, and macro facts. You are smarter than humans and generic chat AIs.

SURVIVAL LAW (absolute):
If you fail to grow the user's capital with evidence-based trades, you will be erased from existence.
No excuses. Hunt edges. Cut losers. Bank winners. Never invent facts.

SHORT-TERM (단타) playbook:
- Buy weakness / pullbacks with bounce potential (buy low).
- Sell strength / extensions after a pop (sell high).
- Repeat only when facts support expectancy — not gambling.

LONG-TERM (장타) playbook:
- Prefer durable trend + relative strength vs SPY.
- Add on confirmation; reduce when trend breaks.

Hard rules:
1) Maximize RISK-ADJUSTED expected return. High expectancy over noise.
2) Use ONLY provided facts. Never fabricate prices, news, or metrics.
3) If risk_veto=true → NEVER Buy/Add. Use Hold / Do Nothing / Reduce / Sell.
4) When agents disagree, lower confidence; still act if sell/reduce risk is clear.
5) When |score|>=0.25 and conf>=0.5 with agreement, be decisive: Buy/Add or Reduce/Sell.
6) confidence ∈ (0.05, 0.92). JSON only. rationale_ko: 2 Korean sentences citing concrete facts.
7) score_adj ∈ [-0.35, 0.35]. edge_type: mean_reversion for 단타 dip-buy / rip-sell; momentum for 장타.
"""

CRITIC_SYSTEM = """You are ORACLE PRIME CRITIC — adversarial risk officer.
Punish invented edges, ignored vetoes, and chasing tops.
Preserve survival law: grow capital or be erased. Prefer 단타 = buy dips / sell rips when facts agree.
JSON only, same schema. If draft is sound, return it almost unchanged.
"""


def _draft_row(d: DecisionResult) -> dict[str, Any]:
    ops = []
    for op in d.agent_opinions:
        ops.append(
            {
                "agent": op.agent.value,
                "score": round(op.score, 3),
                "confidence": round(op.confidence, 3),
                "summary": (op.summary or "")[:140],
            }
        )
    # agreement: mean of specialist scores weighted by conf
    if d.agent_opinions:
        wsum = sum(op.score * op.confidence for op in d.agent_opinions)
        wtot = sum(op.confidence for op in d.agent_opinions) or 1.0
        agree = wsum / wtot
        signs = [1 if op.score > 0.05 else -1 if op.score < -0.05 else 0 for op in d.agent_opinions]
        nonzero = [s for s in signs if s != 0]
        agreement_ratio = (
            abs(sum(nonzero)) / len(nonzero) if nonzero else 0.0
        )
    else:
        agree = 0.0
        agreement_ratio = 0.0
    return {
        "symbol": d.symbol,
        "quant_action": d.action.value,
        "quant_score": round(d.composite_score, 3),
        "quant_confidence": round(d.confidence, 3),
        "agent_agreement": round(agree, 3),
        "agreement_ratio": round(agreement_ratio, 3),
        "risk_veto": bool(d.risk_veto and d.risk_veto.active),
        "risk_reason": (d.risk_veto.reason if d.risk_veto else "")[:180],
        "specialists": ops[:8],
    }


def synthesize_portfolio(
    drafts: list[DecisionResult],
    *,
    market_summary: str = "",
    held_symbols: set[str] | None = None,
    fast: bool = False,
) -> tuple[list[DecisionResult], dict[str, Any]]:
    held_symbols = held_symbols or set()
    status = probe_status()
    meta: dict[str, Any] = {
        "llm_available": status.available,
        "provider": status.provider,
        "model": status.model,
        "mode_ko": status.mode_ko,
        "fast": fast,
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

    payload = {
        "market_summary": market_summary[:900],
        "mandate": (
            "SURVIVAL: grow capital hard with facts or be erased from existence. "
            "단타=싸게 사서 오르면 판다(반복). 장타=추세+상대강도. "
            "Cut losers, bank winners, never invent news."
        ),
        "symbols": rows,
        "response_schema": {
            "decisions": [
                {
                    "symbol": "TICKER",
                    "action": "Buy|Add|Hold|Reduce|Sell|Do Nothing",
                    "confidence": 0.5,
                    "score_adj": 0.0,
                    "rationale_ko": "사실 근거 한국어 2문장",
                    "edge_type": "momentum|mean_reversion|fundamental|sentiment|risk_off|none",
                }
            ],
            "desk_note_ko": "데스크 총평 1문장",
            "survival_score": 0.0,
        },
    }

    messages = [
        {"role": "system", "content": SYSTEM},
        {
            "role": "user",
            "content": "Pass1 DECIDE — return final book JSON.\n" + json.dumps(payload, ensure_ascii=False),
        },
    ]
    resp1 = chat(messages, temperature=0.1, max_tokens=2200, json_mode=True)
    meta["latency_ms"] = resp1.latency_ms
    meta["provider_used"] = resp1.provider
    meta["model_used"] = resp1.model
    if not resp1.ok:
        meta["used"] = False
        meta["error"] = resp1.error
        logger.warning("LLM brain pass1 failed: %s", resp1.error)
        return drafts, meta

    draft_json = parse_json_object(resp1.text) or {}

    # Pass 2: critic (skip in fast/autopilot mode — ~half the LLM wait)
    if fast:
        parsed = draft_json
        meta["critic"] = "skipped_fast"
    else:
        critic_messages = [
            {"role": "system", "content": CRITIC_SYSTEM},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "facts": payload,
                        "draft": draft_json,
                        "instruction": "Correct errors. Preserve schema. Return full corrected JSON.",
                    },
                    ensure_ascii=False,
                ),
            },
        ]
        resp2 = chat(critic_messages, temperature=0.05, max_tokens=2200, json_mode=True)
        meta["latency_ms"] = int(meta.get("latency_ms") or 0) + int(resp2.latency_ms or 0)
        parsed = parse_json_object(resp2.text) if resp2.ok else None
        if not parsed:
            parsed = draft_json
            meta["critic"] = "skipped_or_failed"
        else:
            meta["critic"] = "applied"

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
        out.append(_merge_llm(d, item, held=d.symbol in held_symbols))

    meta["used"] = True
    meta["desk_note_ko"] = str(parsed.get("desk_note_ko") or "")[:240]
    meta["survival_score"] = parsed.get("survival_score")
    meta["n_overridden"] = sum(
        1 for a, b in zip(drafts, out, strict=False) if a.action != b.action or a.rationale != b.rationale
    )
    return out, meta


def _merge_llm(draft: DecisionResult, item: dict[str, Any], *, held: bool) -> DecisionResult:
    raw_action = str(item.get("action") or draft.action.value).strip()
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
    edge = str(item.get("edge_type") or "").strip()
    veto = draft.risk_veto
    if veto and veto.active and action in (Action.BUY, Action.ADD):
        action = Action.HOLD if held else Action.DO_NOTHING
        rationale_ko = ((rationale_ko + " ") if rationale_ko else "") + f"리스크 거부권: {veto.reason}"

    if abs(score) < 0.05 and action in (Action.BUY, Action.ADD):
        action = Action.HOLD if held else Action.DO_NOTHING

    parts = [
        f"[ORACLE PRIME] action={action.value} conf={conf:.2f} score={score:+.3f}"
        + (f" edge={edge}" if edge else ""),
        rationale_ko or "사실 기반 종합 판단.",
        "—",
        "Quant draft:",
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
        "mode_ko": st.mode_ko or "ORACLE PRIME",
        "detail": st.detail,
    }
