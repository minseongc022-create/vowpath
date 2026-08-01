"""Warren Buffett–style rule engine (public principles → FACT scores).

We do NOT copy book text. We encode well-known, public-domain investment
rules as measurable checks against free fundamentals so the autopilot can
grow capital with owner-mindset discipline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from oracle.core.exceptions import DataUnavailableError
from oracle.data.fundamentals import FundamentalSnapshot, fetch_fundamentals


@dataclass(frozen=True)
class Principle:
    id: str
    title_ko: str
    rule_ko: str
    why_ko: str


# Public Buffett/Graham owner principles (paraphrased operating rules).
BUFFETT_PRINCIPLES: tuple[Principle, ...] = (
    Principle(
        "no_permanent_loss",
        " ent 잃지 않는다",
        "원금 영구 손실을 최우선으로 피한다. 확신이 약하면 매수하지 않는다.",
        "복리는 큰 손실 한 번이면 무너진다.",
    ),
    Principle(
        "margin_of_safety",
        "안전마진",
        "싸게가 아니라 ‘충분히 싸게/합리적으로’ 산다. 과대평가·추격은 거절한다.",
        "추정 오차와 악재를 견딜 쿠션이 있어야 한다.",
    ),
    Principle(
        "wonderful_business",
        "훌륭한 사업",
        "그저 싼 사업보다, 지속 이익·현금흐름이 나오는 우량 사업을 선호한다.",
        "시간이 내 편이 되는 사업을 산다.",
    ),
    Principle(
        "moat",
        "경제적 해자",
        "높은 ROE·마진이 유지되는 경쟁우위를 찾는다. 쉽게 대체되는 사업은 피한다.",
        "해자 없는 성장은 결국 경쟁에 먹힌다.",
    ),
    Principle(
        "circle_of_competence",
        "능력 범위",
        "숫자·사업이 이해되지 않으면 패스한다(데이터 공백 = 무지).",
        "모르는 것에 베팅하는 것은 투기다.",
    ),
    Principle(
        "owner_mindset",
        "사업주 마인드",
        "단타 노이즈보다 사업 가치·장기 보유 논리를 우선한다.",
        "주식은 사업의 조각이다.",
    ),
    Principle(
        "mr_market",
        "미스터 마켓",
        "탐욕 장세의 추격을 경계하고, 공포·할인 때 우량을 산다.",
        "시장은 감정이 심할수록 가격이 왜곡된다.",
    ),
    Principle(
        "fortress_balance",
        "튼튼한 재무",
        "과도한 레버리지는 거절한다. 현금창출력·부채 건전성을 본다.",
        "빚은 좋을 때도 키우고 나쁠 때 파산시킨다.",
    ),
    Principle(
        "cash_is_position",
        "현금도 포지션",
        "좋은 공이 올 때까지 현금을 들고 기다릴 수 있다.",
        "억지 매수는 기회비용과 손실을 만든다.",
    ),
    Principle(
        "temperament",
        "기질",
        "조급함·복수매매·과신을 금한다. 사실과 인내만 따른다.",
        "IQ보다 기질이 장기 복리를 좌우한다.",
    ),
)


@dataclass
class CheckResult:
    principle_id: str
    title_ko: str
    passed: bool | None  # None = insufficient data
    score: float  # -1..+1 contribution
    detail_ko: str


@dataclass
class BuffettVerdict:
    symbol: str
    score: float  # -1..+1
    confidence: float
    owner_quality: float  # 0..1
    margin_of_safety: float  # 0..1
    buy_ok: bool
    summary_ko: str
    checks: list[CheckResult] = field(default_factory=list)
    principles_hit: list[str] = field(default_factory=list)
    principles_fail: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "score": round(self.score, 3),
            "confidence": round(self.confidence, 3),
            "owner_quality": round(self.owner_quality, 3),
            "margin_of_safety": round(self.margin_of_safety, 3),
            "buy_ok": self.buy_ok,
            "summary_ko": self.summary_ko,
            "principles_hit": self.principles_hit,
            "principles_fail": self.principles_fail,
            "checks": [
                {
                    "id": c.principle_id,
                    "title": c.title_ko,
                    "passed": c.passed,
                    "score": round(c.score, 3),
                    "detail": c.detail_ko,
                }
                for c in self.checks
            ],
        }


def principles_as_dicts() -> list[dict[str, str]]:
    return [
        {
            "id": p.id,
            "title_ko": p.title_ko,
            "rule_ko": p.rule_ko,
            "why_ko": p.why_ko,
        }
        for p in BUFFETT_PRINCIPLES
    ]


def _norm_de(dte: float | None) -> float | None:
    if dte is None:
        return None
    return dte / 100.0 if dte > 10 else dte


def evaluate_buffett(
    symbol: str,
    *,
    fundamentals: FundamentalSnapshot | None = None,
    chase: bool = False,
    risk_off: bool = False,
) -> BuffettVerdict:
    """Score symbol against Buffett-style owner rules using FACT fundamentals."""
    sym = symbol.upper()
    checks: list[CheckResult] = []

    try:
        f = fundamentals or fetch_fundamentals(sym)
    except DataUnavailableError:
        return BuffettVerdict(
            symbol=sym,
            score=0.0,
            confidence=0.15,
            owner_quality=0.0,
            margin_of_safety=0.0,
            buy_ok=False,
            summary_ko=f"{sym} 펀더멘털 없음 · 능력범위 밖 · 매수 금지",
            checks=[
                CheckResult(
                    "circle_of_competence",
                    "능력 범위",
                    False,
                    -0.6,
                    "재무 데이터 공백",
                )
            ],
            principles_fail=["circle_of_competence"],
        )

    thin = f.trailing_pe is None and f.revenue_growth is None and f.market_cap is None
    if thin or (f.raw or {}).get("quoteType") in {"ETF", "INDEX", "MUTUALFUND"}:
        # Index/ETF: Buffett owns businesses via vehicles sometimes — neutral, allow
        return BuffettVerdict(
            symbol=sym,
            score=0.05,
            confidence=0.35,
            owner_quality=0.45,
            margin_of_safety=0.4,
            buy_ok=True,
            summary_ko=f"{sym} ETF/지수형 · 사업주 심사는 중립(분산 차량)",
            checks=[
                CheckResult(
                    "circle_of_competence",
                    "능력 범위",
                    True,
                    0.05,
                    "ETF/지수 — 개별 사업 심층 심사 면제",
                )
            ],
            principles_hit=["circle_of_competence", "cash_is_position"],
        )

    # --- Moat / wonderful business ---
    roe = f.return_on_equity
    margins = f.profit_margins
    moat_parts = []
    if roe is not None:
        if roe >= 0.18:
            moat_parts.append(0.55)
            checks.append(CheckResult("moat", "경제적 해자", True, 0.4, f"ROE {roe:.1%} 우수"))
        elif roe >= 0.10:
            moat_parts.append(0.15)
            checks.append(CheckResult("moat", "경제적 해자", True, 0.1, f"ROE {roe:.1%} 보통"))
        else:
            moat_parts.append(-0.45)
            checks.append(CheckResult("moat", "경제적 해자", False, -0.35, f"ROE {roe:.1%} 약함"))
    if margins is not None:
        if margins >= 0.15:
            moat_parts.append(0.4)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", True, 0.3, f"이익률 {margins:.1%}")
            )
        elif margins >= 0.06:
            moat_parts.append(0.05)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", None, 0.05, f"이익률 {margins:.1%}")
            )
        else:
            moat_parts.append(-0.4)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", False, -0.3, f"이익률 {margins:.1%} 얇음")
            )

    # --- Fortress balance sheet ---
    de = _norm_de(f.debt_to_equity)
    if de is not None:
        if de <= 0.8:
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", True, 0.25, f"D/E {de:.2f}"))
            moat_parts.append(0.2)
        elif de <= 1.5:
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", None, 0.0, f"D/E {de:.2f}"))
        else:
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", False, -0.45, f"D/E {de:.2f} 과다"))
            moat_parts.append(-0.4)

    # --- Margin of safety (valuation + FCF) ---
    mos_parts: list[float] = []
    pe = f.trailing_pe if f.trailing_pe and f.trailing_pe > 0 else None
    if pe is not None:
        if pe <= 18:
            mos_parts.append(0.45)
            checks.append(CheckResult("margin_of_safety", "안전마진", True, 0.35, f"P/E {pe:.1f}"))
        elif pe <= 30:
            mos_parts.append(0.05)
            checks.append(CheckResult("margin_of_safety", "안전마진", None, 0.05, f"P/E {pe:.1f} 보통"))
        else:
            mos_parts.append(-0.5)
            checks.append(CheckResult("margin_of_safety", "안전마진", False, -0.4, f"P/E {pe:.1f} 고평가"))

    fcf_yield = None
    if f.free_cashflow is not None and f.market_cap and f.market_cap > 0:
        fcf_yield = f.free_cashflow / f.market_cap
        if fcf_yield >= 0.04:
            mos_parts.append(0.5)
            checks.append(
                CheckResult("margin_of_safety", "안전마진", True, 0.35, f"FCF수익률 {fcf_yield:.2%}")
            )
        elif fcf_yield >= 0.015:
            mos_parts.append(0.1)
            checks.append(
                CheckResult("margin_of_safety", "안전마진", None, 0.1, f"FCF수익률 {fcf_yield:.2%}")
            )
        elif fcf_yield < 0:
            mos_parts.append(-0.45)
            checks.append(
                CheckResult("margin_of_safety", "안전마진", False, -0.35, f"FCF 음수 {fcf_yield:.2%}")
            )

    # Growth as quality support (not speculation)
    if f.revenue_growth is not None:
        if 0.03 <= f.revenue_growth <= 0.35:
            moat_parts.append(0.2)
            checks.append(
                CheckResult(
                    "wonderful_business",
                    "훌륭한 사업",
                    True,
                    0.15,
                    f"매출성장 {f.revenue_growth:.1%} 지속형",
                )
            )
        elif f.revenue_growth > 0.6:
            moat_parts.append(-0.15)
            checks.append(
                CheckResult(
                    "temperament",
                    "기질",
                    False,
                    -0.15,
                    f"초고성장 {f.revenue_growth:.1%} · 과열 경계",
                )
            )

    # Mr. Market / temperament situational
    if chase:
        checks.append(
            CheckResult("mr_market", "미스터 마켓", False, -0.5, "고점 추격·확장 구간 · 매수 경계")
        )
        mos_parts.append(-0.4)
    if risk_off:
        checks.append(
            CheckResult(
                "temperament",
                "기질",
                True,
                0.1,
                "리스크오프 · 현금·우량만 (조급 매수 금지)",
            )
        )

    # Circle of competence: enough metrics?
    covered = sum(
        1
        for x in (roe, margins, pe, de, fcf_yield, f.revenue_growth)
        if x is not None
    )
    if covered >= 3:
        checks.append(
            CheckResult("circle_of_competence", "능력 범위", True, 0.15, f"핵심지표 {covered}개 확보")
        )
    else:
        checks.append(
            CheckResult("circle_of_competence", "능력 범위", False, -0.35, f"핵심지표 {covered}개뿐")
        )
        mos_parts.append(-0.2)

    # Don't lose money: aggregate quality + safety
    owner_quality = 0.0
    if moat_parts:
        owner_quality = max(0.0, min(1.0, (sum(moat_parts) / len(moat_parts) + 1) / 2))
    mos = 0.0
    if mos_parts:
        mos = max(0.0, min(1.0, (sum(mos_parts) / len(mos_parts) + 1) / 2))

    score_parts = [c.score for c in checks]
    score = sum(score_parts) / len(score_parts) if score_parts else 0.0
    score = max(-1.0, min(1.0, score))

    # Permanent capital loss filter
    hard_fail = any(
        c.principle_id in {"fortress_balance", "margin_of_safety", "moat"} and c.passed is False
        for c in checks
    )
    if hard_fail and score < 0:
        checks.append(
            CheckResult("no_permanent_loss", "돈을 잃지 않는다", False, -0.3, "품질/안전마진 실패")
        )
        score = min(score, -0.25)
    else:
        checks.append(
            CheckResult(
                "no_permanent_loss",
                "돈을 잃지 않는다",
                score >= -0.05,
                0.15 if score >= 0 else -0.1,
                "손실 방지 점검 통과" if score >= -0.05 else "손실 위험 잔존",
            )
        )

    checks.append(
        CheckResult(
            "owner_mindset",
            "사업주 마인드",
            owner_quality >= 0.45,
            0.2 if owner_quality >= 0.45 else -0.1,
            f"사업품질 {owner_quality:.0%}",
        )
    )
    checks.append(
        CheckResult(
            "cash_is_position",
            "현금도 포지션",
            True if score < 0.15 else None,
            0.1 if score < 0.15 else 0.0,
            "확신이 약하면 현금 유지가 정답" if score < 0.15 else "확신이 있을 때만 투입",
        )
    )

    hit = [c.principle_id for c in checks if c.passed is True]
    fail = [c.principle_id for c in checks if c.passed is False]
    conf = min(0.88, 0.35 + 0.08 * covered + 0.15 * owner_quality)
    buy_ok = score >= 0.08 and owner_quality >= 0.35 and not chase and covered >= 3
    if risk_off:
        buy_ok = buy_ok and score >= 0.25 and mos >= 0.45

    summary = (
        f"{sym} 버핏식 심사 · 점수 {score:+.2f} · 사업품질 {owner_quality:.0%} · "
        f"안전마진 {mos:.0%} · {'매수허용' if buy_ok else '매수보류'}"
    )
    return BuffettVerdict(
        symbol=sym,
        score=score,
        confidence=conf,
        owner_quality=owner_quality,
        margin_of_safety=mos,
        buy_ok=buy_ok,
        summary_ko=summary,
        checks=checks,
        principles_hit=list(dict.fromkeys(hit)),
        principles_fail=list(dict.fromkeys(fail)),
    )
