"""Copyright-safe professional editorial SVGs (cover + mid images + charts)."""

from __future__ import annotations

import hashlib
from pathlib import Path


# Editorial, non-purple-default palettes by vertical cue
VERTICAL_PALETTES = {
    "대출": ("#0b1220", "#f59e0b", "#f8fafc", "#1e293b"),
    "보험": ("#0f172a", "#22d3ee", "#f0fdfa", "#164e63"),
    "정산": ("#111827", "#34d399", "#ecfdf5", "#065f46"),
    "이직": ("#18181b", "#fb7185", "#fff1f2", "#881337"),
    "연봉": ("#1c1917", "#fbbf24", "#fffbeb", "#78350f"),
    "AI": ("#020617", "#38bdf8", "#e0f2fe", "#0c4a6e"),
    "애드": ("#14532d", "#a3e635", "#f7fee7", "#3f6212"),
    "SEO": ("#172554", "#60a5fa", "#eff6ff", "#1e3a8a"),
    "default": ("#0f172a", "#94a3b8", "#f1f5f9", "#334155"),
}


def _pick_palette(keyword: str) -> tuple[str, str, str, str]:
    for key, pal in VERTICAL_PALETTES.items():
        if key.lower() in keyword.lower() or key in keyword:
            return pal
    h = int(hashlib.sha256(keyword.encode()).hexdigest()[:8], 16)
    keys = [k for k in VERTICAL_PALETTES if k != "default"]
    return VERTICAL_PALETTES[keys[h % len(keys)]]


def _esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _wrap(text: str, width: int = 16, max_lines: int = 3) -> list[str]:
    lines: list[str] = []
    chunk = ""
    for ch in text:
        chunk += ch
        if len(chunk) >= width:
            lines.append(chunk)
            chunk = ""
        if len(lines) >= max_lines:
            break
    if chunk and len(lines) < max_lines:
        lines.append(chunk)
    return lines or [text[:width]]


def make_cover_svg(
    title: str,
    keyword: str,
    out_path: Path,
    *,
    chart: list[tuple[str, float]] | None = None,
    trend_note: str = "",
) -> Path:
    bg, accent, fg, muted = _pick_palette(keyword)
    t = _esc(title)
    k = _esc(keyword)
    lines = _wrap(t, 18, 3)
    text_svg = ""
    y = 210
    for i, line in enumerate(lines):
        text_svg += (
            f'<text x="72" y="{y + i * 52}" fill="{fg}" font-size="40" '
            f'font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-weight="800">{line}</text>\n'
        )

    # mini chart panel (right)
    chart_svg = ""
    if chart:
        vals = [max(0.0, float(v)) for _, v in chart[:6]]
        mx = max(vals) or 1.0
        bars = ""
        for i, (lab, v) in enumerate(chart[:6]):
            h = 18 + int(110 * (v / mx))
            x = 720 + i * 70
            yb = 420 - h
            bars += (
                f'<rect x="{x}" y="{yb}" width="42" height="{h}" rx="6" fill="{accent}" opacity="0.9"/>'
                f'<text x="{x + 21}" y="448" fill="{fg}" opacity="0.65" font-size="11" '
                f'text-anchor="middle" font-family="sans-serif">{_esc(lab[:4])}</text>'
            )
        chart_svg = (
            f'<rect x="690" y="160" width="450" height="320" rx="18" fill="{muted}" opacity="0.45"/>'
            f'<text x="720" y="195" fill="{accent}" font-size="16" font-family="sans-serif" font-weight="700">'
            f'검색 관심도</text>{bars}'
        )

    note = _esc(trend_note or "실시간 검색 신호 · 사실 기반 가이드")
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg}"/>
      <stop offset="100%" stop-color="{muted}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="80" r="160" fill="{accent}" opacity="0.16"/>
  <circle cx="80" cy="560" r="200" fill="{accent}" opacity="0.08"/>
  <rect x="72" y="88" width="64" height="6" rx="3" fill="{accent}"/>
  <text x="72" y="130" fill="{accent}" font-size="20" font-family="sans-serif" font-weight="700">KEYWORD · {k}</text>
  {text_svg}
  {chart_svg}
  <text x="72" y="560" fill="{fg}" opacity="0.75" font-size="18" font-family="sans-serif">{note}</text>
  <text x="72" y="592" fill="{fg}" opacity="0.45" font-size="14" font-family="sans-serif">저작권 프리 · 자체 생성 에디토리얼 이미지</text>
</svg>
'''
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(svg, encoding="utf-8")
    return out_path


def make_section_svg(
    heading: str,
    keyword: str,
    out_path: Path,
    *,
    subtitle: str = "",
) -> Path:
    bg, accent, fg, muted = _pick_palette(keyword)
    h = _esc(heading)
    k = _esc(keyword)
    sub = _esc(subtitle or f"{keyword} 핵심 포인트")
    lines = _wrap(h, 22, 2)
    text = ""
    for i, line in enumerate(lines):
        text += (
            f'<text x="64" y="{210 + i * 48}" fill="{fg}" font-size="36" '
            f'font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-weight="700">{line}</text>\n'
        )
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <rect width="1200" height="480" fill="{bg}"/>
  <rect x="0" y="0" width="18" height="480" fill="{accent}"/>
  <rect x="64" y="120" width="88" height="8" rx="4" fill="{accent}"/>
  <text x="64" y="168" fill="{accent}" font-size="18" font-family="sans-serif" font-weight="700">{k}</text>
  {text}
  <text x="64" y="360" fill="{fg}" opacity="0.7" font-size="20" font-family="sans-serif">{sub}</text>
  <circle cx="980" cy="240" r="120" fill="{accent}" opacity="0.12"/>
  <circle cx="1040" cy="300" r="70" fill="{muted}" opacity="0.5"/>
</svg>
'''
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(svg, encoding="utf-8")
    return out_path


def make_chart_svg(chart: list[tuple[str, float]], keyword: str, out_path: Path, title: str = "검색 관심도 비교") -> Path:
    bg, accent, fg, muted = _pick_palette(keyword)
    vals = [max(0.0, float(v)) for _, v in chart[:8]] or [1.0]
    mx = max(vals) or 1.0
    bars = ""
    for i, (lab, v) in enumerate(chart[:8]):
        h = 24 + int(220 * (v / mx))
        x = 100 + i * 130
        y = 360 - h
        bars += (
            f'<rect x="{x}" y="{y}" width="78" height="{h}" rx="8" fill="{accent}"/>'
            f'<text x="{x + 39}" y="400" fill="{fg}" font-size="14" text-anchor="middle" '
            f'font-family="sans-serif">{_esc(str(lab)[:6])}</text>'
            f'<text x="{x + 39}" y="{y - 10}" fill="{fg}" font-size="13" text-anchor="middle" '
            f'font-family="sans-serif">{int(v)}</text>'
        )
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <rect width="1200" height="480" fill="{bg}"/>
  <text x="64" y="72" fill="{accent}" font-size="22" font-family="sans-serif" font-weight="700">{_esc(title)}</text>
  <text x="64" y="104" fill="{fg}" opacity="0.65" font-size="16" font-family="sans-serif">기준 키워드 · {_esc(keyword)} · 실시간 합성 지수</text>
  <rect x="64" y="130" width="1072" height="280" rx="16" fill="{muted}" opacity="0.35"/>
  {bars}
</svg>
'''
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(svg, encoding="utf-8")
    return out_path
