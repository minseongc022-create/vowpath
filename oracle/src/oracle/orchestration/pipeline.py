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
from oracle.llm.brain import synthesize_portfolio
from oracle.portfolio.store import DecisionStore, load_portfolio

logger = logging.getLogger("oracle.orchestration")


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

    def run(self, session: str = "ad_hoc", symbols: list[str] | None = None) -> PipelineResult:
        clear_market_cache()
        run_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
        portfolio = load_portfolio(self.settings.portfolio_path)
        symbols = symbols or self.settings.symbols
        logger.info("Pipeline start run_id=%s session=%s symbols=%s", run_id, session, symbols)

        decisions = []
        for symbol in symbols:
            logger.info("Analyzing %s", symbol)
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
        headlines = aggregate_market_headlines(symbols[:5], per_symbol=2)
        top_news = "; ".join(h.title for h in headlines[:5]) or "No headlines"
        market_summary = f"Index day moves: {overview}. Notable headlines: {top_news}"

        held = set(portfolio.held_symbols())
        decisions, llm_meta = synthesize_portfolio(
            decisions,
            market_summary=market_summary,
            held_symbols=held,
        )
        if llm_meta.get("used"):
            logger.info(
                "Oracle Brain LLM applied provider=%s model=%s latency_ms=%s note=%s",
                llm_meta.get("provider_used"),
                llm_meta.get("model_used"),
                llm_meta.get("latency_ms"),
                (llm_meta.get("desk_note_ko") or "")[:120],
            )
            if llm_meta.get("desk_note_ko"):
                market_summary = f"{market_summary} | Brain: {llm_meta['desk_note_ko']}"
        else:
            logger.warning(
                "Oracle Brain LLM skipped: %s",
                llm_meta.get("error") or llm_meta.get("reason"),
            )

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
