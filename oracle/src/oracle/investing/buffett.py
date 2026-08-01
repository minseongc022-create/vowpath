"""Warren Buffett–style operating playbook → FACT scores.

Encodes publicly known owner principles as executable rules (ROE, margins,
FCF, leverage, PB, liquidity). Does not embed copyrighted book text.
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


# Expanded public owner playbook (paraphrased operating rules, not quotations).
BUFFETT_PRINCIPLES: tuple[Principle, ...] = (
    Principle(
        "no_permanent_loss",
        "돈을 잃지 않는다",
        "원금 영구 손실을 최우선으로 피한다. 확신이 약하면 매수하지 않는다.",
        "복리는 큰 손실 한 번이면 무너진다.",
    ),
    Principle(
        "margin_of_safety",
        "안전마진",
        "추정 오차를 견딜 만큼 싸거나 합리적인 가격에만 산다. 추격 매수는 거절한다.",
        "가격이 가치보다 충분히 낮을 때만 확률이 내 편이 된다.",
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
        "높은 ROE·마진·ROA가 유지되는 경쟁우위를 찾는다.",
        "해자 없는 성장은 경쟁에 먹힌다.",
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
        "주식을 사업의 조각으로 본다. 단타 노이즈보다 사업 가치를 본다.",
        "호가창이 아니라 사업 실적을 산다.",
    ),
    Principle(
        "mr_market",
        "미스터 마켓",
        "탐욕 때 추격하지 말고, 공포·할인 때 우량을 산다.",
        "감정 과잉일수록 가격 왜곡이 커진다.",
    ),
    Principle(
        "fortress_balance",
        "튼튼한 재무",
        "과도한 레버리지·유동성 위기를 거절한다.",
        "빚은 호황을 키우고 불황에 파산시킨다.",
    ),
    Principle(
        "cash_machine",
        "현금창출력",
        "회계이익보다 자유현금흐름·영업현금흐름을 중시한다.",
        "배당·재투자·부채상환의 진짜 원천은 현금이다.",
    ),
    Principle(
        "capital_allocation",
        "자본배치",
        "잉여현금을 현명히 쓸 수 있는 사업(과한 배당 누수·방만 투자 없는)을 선호한다.",
        "좋은 사업도 나쁜 자본배치면 주주 가치가 샌다.",
    ),
    Principle(
        "inflation_resilience",
        "인플레 내성",
        "가격결정력·높은 총이익률 사업을 선호한다.",
        "원가 전가가 되는 사업이 인플레에서 살아남는다.",
    ),
    Principle(
        "predictable_earnings",
        "예측 가능한 이익",
        "실적 롤러코스터·초고성장 투기보다 안정적 복리 이익을 선호한다.",
        "예측 불가능하면 안전마진 계산이 불가능하다.",
    ),
    Principle(
        "cash_is_position",
        "현금도 포지션",
        "좋은 공이 올 때까지 현금을 들고 기다린다.",
        "억지 매수는 기회비용과 손실을 만든다.",
    ),
    Principle(
        "concentration_when_sure",
        "확신 시 집중",
        "확신이 높을 때만 비중을 키우고, 애매하면 작게 하거나 안 산다.",
        "최고의 아이디어에 자원을 모으는 것이 복리다.",
    ),
    Principle(
        "long_holding",
        "장기 보유",
        "우량이면 자주 팔지 않는다. 근거 없는 회전율은 비용이다.",
        "세금·수수료·실수 확률을 줄인다.",
    ),
    Principle(
        "temperament",
        "기질",
        "조급함·복수매매·과신을 금한다. 사실과 인내만 따른다.",
        "IQ보다 기질이 장기 복리를 좌우한다.",
    ),
    Principle(
        "avoid_speculation",
        "투기 금지",
        "스토리·테마·레버리지 베팅을 사업 투자와 혼동하지 않는다.",
        "가격만 보고 사면 투기고, 가치를 보고 사면 투자다.",
    ),
    Principle(
        "opportunity_cost",
        "기회비용",
        "차선보다 최선이 있을 때만 자본을 쓴다. 애매한 2등 아이디어는 거절한다.",
        "모든 매수는 ‘안 사는 선택’과의 비교다.",
    ),
)


@dataclass
class CheckResult:
    principle_id: str
    title_ko: str
    passed: bool | None
    score: float
    detail_ko: str


@dataclass
class BuffettVerdict:
    symbol: str
    score: float
    confidence: float
    owner_quality: float
    margin_of_safety: float
    buy_ok: bool
    summary_ko: str
    checks: list[CheckResult] = field(default_factory=list)
    principles_hit: list[str] = field(default_factory=list)
    principles_fail: list[str] = field(default_factory=list)
    size_hint: float = 0.0  # 0..1 suggested conviction sizing

    def as_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "score": round(self.score, 3),
            "confidence": round(self.confidence, 3),
            "owner_quality": round(self.owner_quality, 3),
            "margin_of_safety": round(self.margin_of_safety, 3),
            "buy_ok": self.buy_ok,
            "size_hint": round(self.size_hint, 3),
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


def _clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def evaluate_buffett(
    symbol: str,
    *,
    fundamentals: FundamentalSnapshot | None = None,
    chase: bool = False,
    risk_off: bool = False,
) -> BuffettVerdict:
    """Score symbol against the full owner playbook using FACT fundamentals."""
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
                CheckResult("circle_of_competence", "능력 범위", False, -0.6, "재무 데이터 공백"),
                CheckResult("avoid_speculation", "투기 금지", False, -0.4, "모르는 자산"),
            ],
            principles_fail=["circle_of_competence", "avoid_speculation"],
            size_hint=0.0,
        )

    thin = f.trailing_pe is None and f.revenue_growth is None and f.market_cap is None
    qtype = (f.raw or {}).get("quoteType")
    if thin or qtype in {"ETF", "INDEX", "MUTUALFUND"}:
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
            size_hint=0.35,
        )

    quality: list[float] = []
    mos_parts: list[float] = []

    # --- Moat / returns on capital ---
    if f.return_on_equity is not None:
        roe = f.return_on_equity
        if roe >= 0.20:
            quality.append(0.6)
            checks.append(CheckResult("moat", "경제적 해자", True, 0.45, f"ROE {roe:.1%} 탁월"))
        elif roe >= 0.12:
            quality.append(0.2)
            checks.append(CheckResult("moat", "경제적 해자", True, 0.15, f"ROE {roe:.1%} 양호"))
        else:
            quality.append(-0.5)
            checks.append(CheckResult("moat", "경제적 해자", False, -0.4, f"ROE {roe:.1%} 약함"))

    if f.return_on_assets is not None:
        roa = f.return_on_assets
        if roa >= 0.08:
            quality.append(0.35)
            checks.append(CheckResult("moat", "경제적 해자", True, 0.2, f"ROA {roa:.1%}"))
        elif roa < 0.03:
            quality.append(-0.25)
            checks.append(CheckResult("moat", "경제적 해자", False, -0.2, f"ROA {roa:.1%} 낮음"))

    # --- Wonderful business / margins / inflation resilience ---
    gm = f.gross_margins
    om = f.operating_margins
    pm = f.profit_margins
    if gm is not None:
        if gm >= 0.4:
            quality.append(0.35)
            checks.append(
                CheckResult("inflation_resilience", "인플레 내성", True, 0.25, f"총이익률 {gm:.1%}")
            )
        elif gm < 0.2:
            quality.append(-0.2)
            checks.append(
                CheckResult("inflation_resilience", "인플레 내성", False, -0.15, f"총이익률 {gm:.1%} 얇음")
            )
    if om is not None:
        if om >= 0.15:
            quality.append(0.4)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", True, 0.3, f"영업이익률 {om:.1%}")
            )
        elif om < 0.05:
            quality.append(-0.35)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", False, -0.25, f"영업이익률 {om:.1%}")
            )
    if pm is not None:
        if pm >= 0.12:
            quality.append(0.35)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", True, 0.25, f"순이익률 {pm:.1%}")
            )
        elif pm < 0.04:
            quality.append(-0.35)
            checks.append(
                CheckResult("wonderful_business", "훌륭한 사업", False, -0.25, f"순이익률 {pm:.1%}")
            )

    # --- Fortress balance / liquidity ---
    de = _norm_de(f.debt_to_equity)
    if de is not None:
        if de <= 0.6:
            quality.append(0.3)
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", True, 0.3, f"D/E {de:.2f}"))
        elif de <= 1.2:
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", None, 0.0, f"D/E {de:.2f}"))
        else:
            quality.append(-0.5)
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", False, -0.5, f"D/E {de:.2f} 과다"))

    if f.current_ratio is not None:
        cr = f.current_ratio
        if cr >= 1.5:
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", True, 0.15, f"유동비율 {cr:.2f}"))
            quality.append(0.15)
        elif cr < 1.0:
            checks.append(CheckResult("fortress_balance", "튼튼한 재무", False, -0.35, f"유동비율 {cr:.2f}"))
            quality.append(-0.3)

    if f.total_cash is not None and f.total_debt is not None and f.total_debt > 0:
        net = f.total_cash - f.total_debt
        if net > 0:
            checks.append(
                CheckResult("fortress_balance", "튼튼한 재무", True, 0.2, "순현금 우위")
            )
            quality.append(0.2)
        elif f.market_cap and abs(net) > 0.6 * f.market_cap:
            checks.append(
                CheckResult("fortress_balance", "튼튼한 재무", False, -0.35, "순부채 과다")
            )
            quality.append(-0.35)

    # --- Cash machine ---
    fcf_yield = None
    if f.free_cashflow is not None and f.market_cap and f.market_cap > 0:
        fcf_yield = f.free_cashflow / f.market_cap
        if fcf_yield >= 0.05:
            mos_parts.append(0.55)
            quality.append(0.35)
            checks.append(
                CheckResult("cash_machine", "현금창출력", True, 0.4, f"FCF수익률 {fcf_yield:.2%}")
            )
        elif fcf_yield >= 0.02:
            mos_parts.append(0.15)
            checks.append(
                CheckResult("cash_machine", "현금창출력", True, 0.15, f"FCF수익률 {fcf_yield:.2%}")
            )
        elif fcf_yield < 0:
            mos_parts.append(-0.5)
            quality.append(-0.35)
            checks.append(
                CheckResult("cash_machine", "현금창출력", False, -0.4, f"FCF 음수 {fcf_yield:.2%}")
            )

    if f.operating_cashflow is not None and f.market_cap and f.market_cap > 0:
        ocf_y = f.operating_cashflow / f.market_cap
        if ocf_y >= 0.06:
            checks.append(
                CheckResult("cash_machine", "현금창출력", True, 0.2, f"영업CF수익률 {ocf_y:.2%}")
            )
            quality.append(0.15)

    # --- Margin of safety / valuation ---
    pe = f.trailing_pe if f.trailing_pe and f.trailing_pe > 0 else None
    fpe = f.forward_pe if f.forward_pe and f.forward_pe > 0 else None
    use_pe = pe or fpe
    if use_pe is not None:
        if use_pe <= 16:
            mos_parts.append(0.5)
            checks.append(CheckResult("margin_of_safety", "안전마진", True, 0.4, f"P/E {use_pe:.1f}"))
        elif use_pe <= 28:
            mos_parts.append(0.05)
            checks.append(CheckResult("margin_of_safety", "안전마진", None, 0.05, f"P/E {use_pe:.1f}"))
        else:
            mos_parts.append(-0.55)
            checks.append(
                CheckResult("margin_of_safety", "안전마진", False, -0.45, f"P/E {use_pe:.1f} 고평가")
            )

    if f.price_to_book is not None and f.price_to_book > 0:
        pb = f.price_to_book
        if pb <= 2.5:
            mos_parts.append(0.25)
            checks.append(CheckResult("margin_of_safety", "안전마진", True, 0.2, f"P/B {pb:.2f}"))
        elif pb >= 12:
            mos_parts.append(-0.35)
            checks.append(
                CheckResult("margin_of_safety", "안전마진", False, -0.25, f"P/B {pb:.2f} 고평가")
            )

    if f.peg_ratio is not None and f.peg_ratio > 0:
        if f.peg_ratio <= 1.2:
            mos_parts.append(0.25)
            checks.append(CheckResult("margin_of_safety", "안전마진", True, 0.2, f"PEG {f.peg_ratio:.2f}"))
        elif f.peg_ratio >= 3.0:
            mos_parts.append(-0.3)
            checks.append(
                CheckResult("margin_of_safety", "안전마진", False, -0.2, f"PEG {f.peg_ratio:.2f}")
            )

    # --- Predictable earnings / growth ---
    if f.revenue_growth is not None:
        g = f.revenue_growth
        if 0.02 <= g <= 0.25:
            quality.append(0.25)
            checks.append(
                CheckResult(
                    "predictable_earnings",
                    "예측 가능한 이익",
                    True,
                    0.2,
                    f"매출성장 {g:.1%} 지속형",
                )
            )
        elif g > 0.55:
            quality.append(-0.2)
            checks.append(
                CheckResult(
                    "avoid_speculation",
                    "투기 금지",
                    False,
                    -0.25,
                    f"초고성장 {g:.1%} · 스토리 위험",
                )
            )
        elif g < -0.1:
            quality.append(-0.3)
            checks.append(
                CheckResult(
                    "predictable_earnings",
                    "예측 가능한 이익",
                    False,
                    -0.25,
                    f"매출감소 {g:.1%}",
                )
            )

    # --- Capital allocation (payout sanity) ---
    if f.payout_ratio is not None:
        pr = f.payout_ratio
        # yfinance sometimes 0-1 or 0-100
        if pr > 1.5:
            pr = pr / 100.0
        if 0.1 <= pr <= 0.7:
            checks.append(
                CheckResult("capital_allocation", "자본배치", True, 0.15, f"배당성향 {pr:.0%}")
            )
            quality.append(0.1)
        elif pr > 1.0:
            checks.append(
                CheckResult("capital_allocation", "자본배치", False, -0.25, f"배당성향 {pr:.0%} 과다")
            )
            quality.append(-0.2)

    # --- Situational temperament / Mr. Market ---
    if chase:
        checks.append(
            CheckResult("mr_market", "미스터 마켓", False, -0.55, "고점 추격 · 매수 경계")
        )
        checks.append(
            CheckResult("avoid_speculation", "투기 금지", False, -0.35, "확장·추격 구간")
        )
        mos_parts.append(-0.45)
    if risk_off:
        checks.append(
            CheckResult("temperament", "기질", True, 0.15, "리스크오프 · 조급 매수 금지")
        )
        checks.append(
            CheckResult("cash_is_position", "현금도 포지션", True, 0.2, "현금 대기 가치 상승")
        )

    covered = sum(
        1
        for x in (
            f.return_on_equity,
            pm or om,
            use_pe,
            de,
            fcf_yield,
            f.revenue_growth,
            f.price_to_book,
            f.current_ratio,
        )
        if x is not None
    )
    if covered >= 4:
        checks.append(
            CheckResult("circle_of_competence", "능력 범위", True, 0.2, f"핵심지표 {covered}개")
        )
    else:
        checks.append(
            CheckResult("circle_of_competence", "능력 범위", False, -0.4, f"핵심지표 {covered}개뿐")
        )
        mos_parts.append(-0.25)

    owner_quality = 0.0
    if quality:
        owner_quality = max(0.0, min(1.0, (sum(quality) / len(quality) + 1) / 2))
    mos = 0.0
    if mos_parts:
        mos = max(0.0, min(1.0, (sum(mos_parts) / len(mos_parts) + 1) / 2))

    score_parts = [c.score for c in checks]
    score = _clamp(sum(score_parts) / len(score_parts) if score_parts else 0.0)

    hard_fail = any(
        c.principle_id in {"fortress_balance", "margin_of_safety", "moat", "cash_machine"}
        and c.passed is False
        for c in checks
    )
    if hard_fail and score < 0.05:
        checks.append(
            CheckResult("no_permanent_loss", "돈을 잃지 않는다", False, -0.35, "품질/안전 실패")
        )
        score = min(score, -0.2)
    else:
        checks.append(
            CheckResult(
                "no_permanent_loss",
                "돈을 잃지 않는다",
                score >= 0.0,
                0.2 if score >= 0 else -0.15,
                "손실 방지 통과" if score >= 0 else "손실 위험",
            )
        )

    checks.append(
        CheckResult(
            "owner_mindset",
            "사업주 마인드",
            owner_quality >= 0.5,
            0.25 if owner_quality >= 0.5 else -0.1,
            f"사업품질 {owner_quality:.0%}",
        )
    )
    checks.append(
        CheckResult(
            "long_holding",
            "장기 보유",
            owner_quality >= 0.55 and mos >= 0.4,
            0.15 if owner_quality >= 0.55 else 0.0,
            "우량+합리가격이면 장기 보유 후보" if owner_quality >= 0.55 else "회전 대상 아님·관망",
        )
    )
    checks.append(
        CheckResult(
            "opportunity_cost",
            "기회비용",
            score >= 0.15,
            0.15 if score >= 0.15 else -0.1,
            "최선 아이디어 수준" if score >= 0.15 else "차선·패스 유리",
        )
    )
    checks.append(
        CheckResult(
            "cash_is_position",
            "현금도 포지션",
            True if score < 0.12 else None,
            0.15 if score < 0.12 else 0.0,
            "확신 약함 → 현금" if score < 0.12 else "확신 있을 때만 투입",
        )
    )
    checks.append(
        CheckResult(
            "concentration_when_sure",
            "확신 시 집중",
            score >= 0.35 and owner_quality >= 0.6,
            0.2 if score >= 0.35 and owner_quality >= 0.6 else 0.0,
            "고확신 → 비중 확대 후보"
            if score >= 0.35 and owner_quality >= 0.6
            else "애매 → 작게/보류",
        )
    )
    checks.append(
        CheckResult(
            "temperament",
            "기질",
            not chase,
            0.1 if not chase else -0.3,
            "추격 없음" if not chase else "추격 기질 위반",
        )
    )

    # Recompute score after terminal checks
    score = _clamp(sum(c.score for c in checks) / len(checks))

    hit = [c.principle_id for c in checks if c.passed is True]
    fail = [c.principle_id for c in checks if c.passed is False]
    conf = min(0.9, 0.32 + 0.07 * covered + 0.2 * owner_quality)
    buy_ok = (
        score >= 0.1
        and owner_quality >= 0.4
        and not chase
        and covered >= 4
        and "circle_of_competence" not in fail
    )
    if risk_off:
        buy_ok = buy_ok and score >= 0.28 and mos >= 0.5

    # Conviction sizing hint for autopilot
    if not buy_ok:
        size_hint = 0.0
    elif score >= 0.4 and owner_quality >= 0.65 and mos >= 0.5:
        size_hint = 1.0
    elif score >= 0.25:
        size_hint = 0.7
    else:
        size_hint = 0.35

    summary = (
        f"{sym} 버핏 풀플레이북 · 점수 {score:+.2f} · 사업품질 {owner_quality:.0%} · "
        f"안전마진 {mos:.0%} · 확신비중 {size_hint:.0%} · "
        f"{'매수허용' if buy_ok else '매수보류'}"
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
        size_hint=size_hint,
    )
