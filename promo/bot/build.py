"""Картинки профиля бота: приветствие (GIF 640×360 и PNG) и аватарка (640×640).

Собирает композиции HyperFrames в promo/bot/welcome/ и promo/bot/avatar/; рендер — promo/bot/render.sh.
Стиль — как у роликов: тёмный фон, белые линии, оранжевая метка.
"""

import base64
from pathlib import Path

HERE = Path(__file__).parent
FONTS = HERE.parent / "video" / "fonts"


def font_css() -> str:
    cyr = base64.b64encode((FONTS / "montserrat-cyrillic.woff2").read_bytes()).decode()
    lat = base64.b64encode((FONTS / "montserrat-latin.woff2").read_bytes()).decode()
    return (f"@font-face {{ font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,{cyr}) format('woff2');"
            " unicode-range: U+0400-045F, U+2116; }\n"
            f"@font-face {{ font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,{lat}) format('woff2');"
            " unicode-range: U+0000-00FF, U+2000-206F; }")


ACCENT = "#ff8a2a"
PIN = "M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z"


def church(x: float, y: float, k: float) -> str:
    return f"""<g transform="translate({x} {y}) scale({k})" fill="#0e1520" stroke="#f4f4f2" stroke-width="{4 / k:.1f}">
      <path d="M-80,0 V-150 H80 V0 Z M-80,-150 L0,-200 L80,-150"/>
      <path d="M-28,-200 V-262 H28 V-200"/>
      <path d="M-34,-262 C-40,-300 -10,-318 0,-342 C10,-318 40,-300 34,-262 Z"/>
      <path d="M0,-342 V-392 M-14,-376 H14 M-10,-360 l20,-8" fill="none"/>
      <path d="M-30,0 V-70 Q0,-96 30,-70 V0" fill="none"/>
      <path d="M110,0 V-210 H160 V0 Z M110,-210 L135,-250 L160,-210 M135,-250 v-30 M127,-268 h16"/>
    </g>"""


def page(title: str, w: int, h: int, dur: float, body: str, tweens: str, res: str) -> str:
    return f"""<!doctype html>
<html lang="ru" data-resolution="{res}">
<head><meta charset="UTF-8"><meta name="viewport" content="width={w}, height={h}"><title>{title}</title>
<script src="gsap.min.js"></script>
<style>{font_css()}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {w}px; height: {h}px; overflow: hidden; background: #07090d; }}
#root {{ position: relative; width: {w}px; height: {h}px; overflow: hidden; font-family: 'Montserrat', sans-serif;
  background: radial-gradient(70% 70% at 50% 45%, #182030 0%, #07090d 100%); }}
svg {{ position: absolute; left: 0; top: 0; }}
</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="{dur}" data-width="{w}" data-height="{h}">
{body}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{tweens}
tl.set({{}}, {{}}, {dur});
window.__timelines = window.__timelines || {{}}; window.__timelines['main'] = tl; tl.seek(0);
</script></body></html>
"""


# ─── Приветствие: фото → место (1280×720, в Telegram показывается как 640×360) ─────────────────

W, H = 1280, 720
photo = f"""<g id="photo">
    <rect x="110" y="190" width="400" height="400" rx="34" fill="#0b0e13" stroke="#f4f4f2" stroke-width="7"/>
    <rect x="134" y="214" width="352" height="352" rx="18" fill="#0e1520"/>
    <circle cx="420" cy="290" r="26" fill="#ffcf9a" opacity="0.85"/>
    <path d="M134,500 C220,470 330,460 486,480" stroke="#cfd5de" stroke-width="4" fill="none"/>
    {church(290, 492, 0.62)}
    <rect id="scan" x="134" y="214" width="352" height="10" fill="{ACCENT}" opacity="0"/>
  </g>"""
arrow = """<g id="arrow" opacity="0" stroke="#8b919c" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M565,390 H705 M675,360 L710,390 L675,420"/></g>"""
mapcard = f"""<g id="map" opacity="0">
    <rect x="770" y="190" width="400" height="400" rx="34" fill="#132018" stroke="#f4f4f2" stroke-width="7"/>
    <path d="M794,330 C900,300 1000,380 1146,320 M890,214 C920,330 860,450 900,566 M1060,214 L1010,566" stroke="#3f5a4b" stroke-width="18" fill="none"/>
    <path d="M794,330 C900,300 1000,380 1146,320" stroke="#7da08c" stroke-width="4" fill="none"/>
    <circle cx="955" cy="370" r="12" fill="#f4f4f2" opacity="0.5"/>
  </g>
  <g id="pin" opacity="0"><g transform="translate(955 372)"><path d="{PIN}" fill="{ACCENT}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
  <g id="label" opacity="0"><rect x="800" y="470" width="340" height="88" rx="18" fill="#232a34"/>
    <text x="970" y="507" font-size="30" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">Старое Чурилино</text>
    <text x="970" y="543" font-size="22" fill="#cfd5de" text-anchor="middle" font-family="Montserrat">Республика Татарстан</text></g>"""
texts = f"""<div style="position:absolute;left:0;right:0;top:62px;text-align:center;font-size:52px;font-weight:800;color:#fff">
    Где снято это фото?</div>
  <div style="position:absolute;left:0;right:0;bottom:56px;text-align:center;font-size:27px;font-weight:600;color:#9aa0aa;letter-spacing:1px">
    GPS · текст и вывески · поиск по картинке · <span style="color:{ACCENT}">ИИ</span></div>"""
WELCOME_DUR = 4.0
welcome_tweens = f"""
tl.fromTo('#photo', {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, 0.1);
tl.set('#scan', {{ opacity: 0.85 }}, 0.55);
tl.fromTo('#scan', {{ y: 0 }}, {{ y: 342, duration: 0.9, ease: 'none' }}, 0.55);
tl.set('#scan', {{ opacity: 0 }}, 1.45);
tl.fromTo('#arrow', {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.3 }}, 1.45);
tl.fromTo('#map', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 1.7);
tl.fromTo('#pin', {{ opacity: 0, y: -80 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }}, 1.95);
tl.fromTo('#label', {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, 2.4);
tl.to(['#photo', '#arrow', '#map', '#pin', '#label'], {{ opacity: 0, duration: 0.3 }}, {WELCOME_DUR - 0.35});
"""
(HERE / "welcome" / "index.html").write_text(
    page("GeoSleuth: приветствие", W, H, WELCOME_DUR,
         f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}">{photo}{arrow}{mapcard}</svg>{texts}', welcome_tweens, "landscape"),
    encoding="utf-8")

# ─── Аватарка: фото-рамка с горами и большая метка (1080×1080, Telegram обрежет в круг) ────────

A = 1080
avatar = f"""<svg viewBox="0 0 {A} {A}" width="{A}" height="{A}">
  <circle cx="540" cy="540" r="540" fill="#0d121b"/>
  <rect x="250" y="330" width="580" height="440" rx="48" fill="#0b0e13" stroke="#f4f4f2" stroke-width="22"/>
  <path d="M300,700 L440,540 L530,630 L630,500 L780,700" stroke="#f4f4f2" stroke-width="20" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="690" cy="430" r="40" fill="#f4f4f2"/>
  <g transform="translate(540 600) scale(3.1)"><path d="{PIN}" fill="{ACCENT}" stroke="#0d121b" stroke-width="4"/><circle cy="-64" r="13" fill="#0d121b"/></g>
</svg>"""
(HERE / "avatar" / "index.html").write_text(page("GeoSleuth: аватарка", A, A, 1.0, avatar, "", "square"), encoding="utf-8")
print("ok")
