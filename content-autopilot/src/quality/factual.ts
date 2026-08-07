/** Heuristics to block fabricated news / fake statistics in body text. */

const FABRICATION_PATTERNS = [
  /속보[:：]/,
  /단독\s*[:：]/,
  /(?:공식|정부)\s*발표(?:에)?\s*따르면(?![^.\n]{0,80}(?:일반|원칙|통상|예시))/,
  /(?:확인|입수|보도)됐(?:다|습니다)/,
  /(?:\d{1,3}(?:\.\d+)?)\s*%\s*(?:급등|폭락|확정)/,
  /(?:20\d{2}년\s*\d{1,2}월\s*\d{1,2}일)\s*(?:발표|확인)/,
  /"[^"]{10,}"\s*(?:라고|고)\s*(?:밝혔|말했|전했다)/,
  /(?:유명인|○○|XX)\s*(?:이|가)\s*(?:했다|했다고)/,
];

const UNVERIFIED_SUPERLATIVES = [
  /100%\s*(?:확실|보장|수익)/,
  /무조건\s*(?:수익|성공|대박)/,
  /(?:공식|정부)\s*인증\s*수익/,
  /(?:검증\s*)?완료\s*수익\s*보장/,
];

export function factualRiskScore(title: string, md: string): number {
  const blob = `${title}\n${md}`;
  let risk = 0;
  for (const p of FABRICATION_PATTERNS) {
    if (p.test(blob)) risk += 0.22;
  }
  for (const p of UNVERIFIED_SUPERLATIVES) {
    if (p.test(blob)) risk += 0.25;
  }
  // Invented precise stats without hedging
  const hardStats = blob.match(/\d{1,3}(?:,\d{3})+\s*원|\d+\s*억\s*원/g) || [];
  const hedged = /(?:예를 들어|가령|대략|약|일반적으로|경우에 따라)/.test(blob);
  if (hardStats.length >= 3 && !hedged) risk += 0.15;
  return Math.min(1, risk);
}

export function passesFactualGate(title: string, md: string, blockUnverifiedStats: boolean): {
  ok: boolean;
  detail: string;
  risk: number;
} {
  const risk = factualRiskScore(title, md);
  const ok = !blockUnverifiedStats || risk < 0.35;
  return {
    ok,
    detail: ok ? `factual_risk=${risk.toFixed(2)}` : `high fabrication risk=${risk.toFixed(2)}`,
    risk,
  };
}
