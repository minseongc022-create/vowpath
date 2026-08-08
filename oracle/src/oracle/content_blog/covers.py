"""Copyright-safe cover images (procedural SVG — no stock photo license risk)."""

from __future__ import annotations

import hashlib
from pathlib import Path


PALETTES = [
    ("#0f172a", "#38bdf8", "#e2e8f0"),
    ("#14532d", "#4ade80", "#ecfdf5"),
    ("#7c2d12", "#fb923c", "#fff7ed"),
    ("#1e3a8a", "#93c5fd", "#eff6ff"),
    ("#4a044e", "#e879f9", "#fdf4ff"),
]


def _palette(seed: str) -> tuple[str, str, str]:
    h = int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16)
    return PALETTES[h % len(PALETTES)]


def make_cover_svg(title: str, keyword: str, out_path: Path) -> Path:
    bg, accent, fg = _palette(keyword + title)
    # Escape for XML
    t = (
        title.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    k = keyword.replace("&", "&amp;").replace("<", "&lt;")
    # wrap title roughly
    lines = []
    chunk = ""
    for ch in t:
        chunk += ch
        if len(chunk) >= 18:
            lines.append(chunk)
            chunk = ""
    if chunk:
        lines.append(chunk)
    lines = lines[:4] or [t[:18]]
    text_svg = ""
    y = 200
    for i, line in enumerate(lines):
        text_svg += f'<text x="80" y="{y + i * 48}" fill="{fg}" font-size="36" font-family="system-ui,sans-serif" font-weight="700">{line}</text>\n'

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg}"/>
      <stop offset="100%" stop-color="{accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="980" cy="120" r="180" fill="{accent}" opacity="0.25"/>
  <circle cx="200" cy="520" r="220" fill="{accent}" opacity="0.12"/>
  <rect x="80" y="120" width="120" height="8" rx="4" fill="{accent}"/>
  <text x="80" y="160" fill="{accent}" font-size="22" font-family="system-ui,sans-serif" font-weight="600">{k}</text>
  {text_svg}
  <text x="80" y="560" fill="{fg}" opacity="0.7" font-size="20" font-family="system-ui,sans-serif">사실 기반 · 실무 가이드</text>
</svg>
'''
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(svg, encoding="utf-8")
    return out_path
