"""Configuration loading — YAML + environment variables."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from oracle.core.exceptions import ConfigError


class RiskConfig(BaseModel):
    max_position_pct: float = 0.15
    max_sector_pct: float = 0.35
    max_portfolio_volatility: float = 0.25
    max_drawdown_halt: float = 0.12
    min_cash_pct: float = 0.10
    max_correlation_cluster: float = 0.85
    atr_stop_multiple: float = 2.0
    veto_confidence_floor: float = 0.55


class DecisionConfig(BaseModel):
    buy_threshold: float = 0.55
    add_threshold: float = 0.45
    reduce_threshold: float = -0.35
    sell_threshold: float = -0.55


class Settings(BaseModel):
    system_name: str = "Project Oracle"
    version: str = "1.1.0"
    timezone: str = "America/New_York"
    symbols: list[str] = Field(default_factory=list)
    history_days: int = 365
    benchmark: str = "SPY"
    cache_hours: float = 6.0
    agent_weights: dict[str, float] = Field(default_factory=dict)
    risk: RiskConfig = Field(default_factory=RiskConfig)
    decision: DecisionConfig = Field(default_factory=DecisionConfig)
    report_output_dir: str = "./data/reports"
    include_agent_details: bool = True
    backtest_initial_cash: float = 100_000
    commission_bps: float = 5
    slippage_bps: float = 5
    data_dir: str = "./data"
    portfolio_path: str = "./config/portfolio.yaml"


class EnvSettings(BaseSettings):
    oracle_env: str = "development"
    oracle_log_level: str = "INFO"
    oracle_data_dir: str = "./data"
    oracle_config_path: str = "./config/settings.yaml"
    oracle_portfolio_path: str = "./config/portfolio.yaml"

    model_config = {"env_file": ".env", "extra": "ignore"}


def _repo_root() -> Path:
    # src/oracle/config.py -> parents: oracle, src, oracle-project-root
    return Path(__file__).resolve().parents[2]


def resolve_path(path: str | Path) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    # Prefer CWD (when running from oracle/), else package root
    cwd_candidate = Path.cwd() / p
    if cwd_candidate.exists():
        return cwd_candidate
    root_candidate = _repo_root() / p
    if root_candidate.exists():
        return root_candidate
    return cwd_candidate


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ConfigError(f"Config must be a mapping: {path}")
    return data


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_dotenv()
    env = EnvSettings()
    config_path = resolve_path(env.oracle_config_path)
    raw = load_yaml(config_path) if config_path.exists() else {}

    system = raw.get("system", {})
    universe = raw.get("universe", {})
    market = raw.get("market_data", {})
    reporting = raw.get("reporting", {})
    backtest = raw.get("backtest", {})

    return Settings(
        system_name=system.get("name", "Project Oracle"),
        version=system.get("version", "0.1.0"),
        timezone=system.get("timezone", "America/New_York"),
        symbols=list(universe.get("symbols", [])),
        history_days=int(market.get("history_days", 365)),
        benchmark=str(market.get("benchmark", "SPY")),
        cache_hours=float(market.get("cache_hours", 6.0)),
        agent_weights=dict(raw.get("agent_weights", {})),
        risk=RiskConfig(**raw.get("risk", {})),
        decision=DecisionConfig(**raw.get("decision", {})),
        report_output_dir=reporting.get("output_dir", "./data/reports"),
        include_agent_details=bool(reporting.get("include_agent_details", True)),
        backtest_initial_cash=float(backtest.get("initial_cash", 100_000)),
        commission_bps=float(backtest.get("commission_bps", 5)),
        slippage_bps=float(backtest.get("slippage_bps", 5)),
        data_dir=env.oracle_data_dir or os.getenv("ORACLE_DATA_DIR", "./data"),
        portfolio_path=env.oracle_portfolio_path,
    )


def clear_settings_cache() -> None:
    get_settings.cache_clear()
