"""Multi-agent orchestration pipeline."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from oracle.agents import (
    DecisionAgent,
    FundamentalAnalysisAgent,
    MarketIntelligenceAgent,
    PortfolioManagerAgent,
    QuantAgent,
    RiskManagerAgent,
    SentimentAgent,
    TechnicalAnalysisAgent,
)
from oracle.config import Settings, get_settings
from oracle.core.types import AgentOpinion, PipelineResult
from oracle.data.market import clear_market_cache, index_overview
from oracle.data.news import aggregate_market_headlines
from oracle.execution.live_setup import goal_progress
from oracle.llm.brain import synthesize_portfolio
from oracle.portfolio.activity_log import log_activity
from oracle.portfolio.store import DecisionStore, load_portfolio

logger = logging.getLogger("oracle.orchestration")


def _build_regime(overview: dict) -> dict:
    """L1 regime pack from index day moves."""
    spy = float(overview.get("SPY") or 0.0)
    qqq = float(overview.get("QQQ") or 0.0)
    vix = float(overview.get("^VIX") or overview.get("VIX") or 0.0)
    risk_off = vix >= 22 or (spy <= -1.2 and qqq <= -1.2)
    risk_on = vix > 0 and vix <= 16 and spy >= 0.3
    if risk_off:
        label = "risk_off"
    elif risk_on:
        label = "risk_on"
    else:
        label = "neutral"
    return {
        "label": label,
        "spy_day": spy,
        "qqq_day": qqq,
        "vix": vix,
        "risk_off": risk_off,
    }


class OraclePipeline:
    """Runs specialist agents → Risk veto → Decision → LLM brain for each book."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.market_intel = MarketIntelligenceAgent()
        self.fundamental = FundamentalAnalysisAgent()
        self.technical = TechnicalAnalysisAgent()
        self.quant = QuantAgent()
        self.sentiment = SentimentAgent()
        self.portfolio_mgr = PortfolioManagerAgent()
        self.risk = RiskManagerAgent()
        self.decision = DecisionAgent(self.settings)

    def run(
        self,
        session: str = "ad_hoc",
        symbols: list[str] | None = None,
        *,
        on_progress=None,
        fast_llm: bool | None = None,
        deep_llm: bool = False,
    ) -> PipelineResult:
        clear_market_cache()
        run_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
        portfolio = load_portfolio(self.settings.portfolio_path)
        symbols = symbols or self.settings.symbols
        if fast_llm is None:
            fast_llm = session == "autopilot" and not deep_llm

        def _prog(msg: str) -> None:
            if on_progress:
                try:
                    on_progress(msg)
                except Exception:
                    logger.debug("on_progress failed", exc_info=True)

        logger.info("Pipeline start run_id=%s session=%s symbols=%s", run_id, session, symbols)
        _prog(f"AI 분석 시작 · {len(symbols)}종목 · 지능 Lv4")
        log_activity("analyze", f"분석 시작 · {len(symbols)}종목", detail=", ".join(symbols[:10]))

        decisions = []
        for i, symbol in enumerate(symbols, 1):
            logger.info("Analyzing %s", symbol)
            _prog(f"지표 분석 {i}/{len(symbols)} · {symbol}")
            opinions: list[AgentOpinion] = []
            for agent in (
                self.market_intel,
                self.fundamental,
                self.technical,
                self.quant,
                self.sentiment,
                self.portfolio_mgr,
                self.risk,
            ):
                try:
                    opinions.append(agent.analyze(symbol, portfolio))
                except Exception:
                    logger.exception("Agent %s failed on %s", agent.name, symbol)

            veto = self.risk.veto(symbol, portfolio)
            decision = self.decision.decide(symbol, opinions, veto, portfolio)
            decisions.append(decision)
            logger.info(
                "%s draft → %s (score=%+.3f conf=%.2f veto=%s)",
                symbol,
                decision.action.value,
                decision.composite_score,
                decision.confidence,
                veto.active,
            )

        overview = index_overview()
        regime = _build_regime(overview)
        gprog = goal_progress(float(portfolio.equity()))
        headlines = aggregate_market_headlines(symbols[:6], per_symbol=3)
        # Richer fact pack for ORACLE PRIME
        news_bits = []
        for h in headlines[:12]:
            bit = h.title.strip()
            if h.publisher:
                bit = f"[{h.publisher}] {bit}"
            news_bits.append(bit)
        top_news = " | ".join(news_bits) or "No headlines"
        market_summary = (
            f"Index day moves: {overview}. Regime={regime.get('label')}. "
            f"FACT headlines: {top_news}. "
            f"Session={session}. Goal urgency={gprog.get('urgency', 0)}. "
            f"Mandate=grow capital by deadline or be erased."
        )
        _prog(f"시장 레짐 · {regime.get('label')} · VIX {regime.get('vix')}")

        held = set(portfolio.held_symbols())
        decisions, llm_meta = synthesize_portfolio(
            decisions,
            market_summary=market_summary,
            held_symbols=held,
            fast=bool(fast_llm) and not deep_llm,
            deep=bool(deep_llm) or float(gprog.get("urgency") or 0) >= 0.75,
            goal_context=gprog,
            regime=regime,
            on_progress=_prog,
        )
        if llm_meta.get("used"):
            logger.info(
                "Oracle Brain LLM applied provider=%s model=%s latency_ms=%s note=%s",
                llm_meta.get("provider_used"),
                llm_meta.get("model_used"),
                llm_meta.get("latency_ms"),
                (llm_meta.get("desk_note_ko") or "")[:120],
            )
            note = (llm_meta.get("desk_note_ko") or "")[:80]
            _prog(f"AI 판단 완료 · {llm_meta.get('latency_ms', '?')}ms" + (f" · {note}" if note else ""))
            log_activity(
                "brain",
                f"두뇌 판단 완료 · {llm_meta.get('latency_ms', '?')}ms",
                detail=note or f"critic={llm_meta.get('critic')} referee={llm_meta.get('referee')}",
            )
            if llm_meta.get("desk_note_ko"):
                market_summary = f"{market_summary} | Brain: {llm_meta['desk_note_ko']}"
        else:
            logger.warning(
                "Oracle Brain LLM skipped: %s",
                llm_meta.get("error") or llm_meta.get("reason"),
            )
            _prog("AI 두뇌 생략 · 정량 신호로 진행")
            log_activity("brain", "두뇌 생략 · 정량 신호", detail=str(llm_meta.get("error") or llm_meta.get("reason") or ""))

        for d in decisions:
            logger.info(
                "%s final → %s (score=%+.3f conf=%.2f)",
                d.symbol,
                d.action.value,
                d.composite_score,
                d.confidence,
            )

        port_risk, _ = self.risk.evaluate_portfolio(portfolio)
        result = PipelineResult(
            run_id=run_id,
            session=session,
            decisions=decisions,
            market_summary=market_summary,
            portfolio_equity=portfolio.equity(),
            portfolio_risk_score=port_risk,
        )

        store = DecisionStore(f"{self.settings.data_dir}/oracle.db")
        store.save_run(
            run_id=run_id,
            session=session,
            market_summary=market_summary,
            portfolio_equity=portfolio.equity(),
            portfolio_risk_score=port_risk,
            decisions=decisions,
        )
        logger.info(
            "Pipeline complete run_id=%s equity=%.2f risk=%.2f",
            run_id,
            portfolio.equity(),
            port_risk,
        )
        return result
