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


# ─── Приветствие: лупа находит подсказки на фото → метка на карте (1280×720 → GIF 960×540) ─────

W, H = 1280, 720
BG = "#0b0f16"
# Фото: загородная дорога в перспективе, знак трассы, машина с номером, берёзы и столб.
PX, PY, PW, PH = 100, 170, 500, 420
road_photo = f"""<g id="photo">
    <rect x="{PX - 10}" y="{PY - 10}" width="{PW + 20}" height="{PH + 20}" rx="30" fill="#0f141c" stroke="#f4f4f2" stroke-width="7"/>
    <clipPath id="ph"><rect x="{PX + 12}" y="{PY + 12}" width="{PW - 24}" height="{PH - 24}" rx="16"/></clipPath>
    <g clip-path="url(#ph)">
      <rect x="{PX}" y="{PY}" width="{PW}" height="{PH}" fill="#16263a"/>
      <rect x="{PX}" y="{PY + 205}" width="{PW}" height="{PH - 205}" fill="#1b2a1f"/>
      <path d="M{PX},{PY + 205} H{PX + PW}" stroke="#7f8a99" stroke-width="3"/>
      <path d="M{PX + 190},{PY + PH} L{PX + 330},{PY + 205} L{PX + 350},{PY + 205} L{PX + 470},{PY + PH} Z" fill="#2a2f38"/>
      <path d="M{PX + 330},{PY + PH} L{PX + 340},{PY + 205}" stroke="#f4f4f2" stroke-width="5" stroke-dasharray="18 16"/>
      <g stroke="#f4f4f2" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M{PX + 70},{PY + 330} V{PY + 120} M{PX + 70},{PY + 160} l-26,-18 M{PX + 70},{PY + 200} l28,-22 M{PX + 70},{PY + 250} l-22,-14"/>
        <path d="M{PX + 130},{PY + 300} V{PY + 140} M{PX + 130},{PY + 180} l22,-16 M{PX + 130},{PY + 225} l-20,-14"/>
        <path d="M{PX + 62},{PY + 170} h12 M{PX + 64},{PY + 215} h10 M{PX + 62},{PY + 270} h12 M{PX + 124},{PY + 200} h10 M{PX + 125},{PY + 250} h10" stroke="#0f141c" stroke-width="5"/>
        <path d="M{PX + 430},{PY + 330} V{PY + 70} M{PX + 395},{PY + 95} H{PX + 465} M{PX + 405},{PY + 95} v14 M{PX + 455},{PY + 95} v14"/>
        <path d="M{PX + 12},{PY + 60} Q{PX + 210},{PY + 120} {PX + 430},{PY + 95} Q{PX + 470},{PY + 92} {PX + PW},{PY + 80}" stroke-width="2.5"/>
      </g>
      <g id="sign"><path d="M{PX + 372},{PY + 205} V{PY + 150}" stroke="#f4f4f2" stroke-width="5"/>
        <rect x="{PX + 336}" y="{PY + 104}" width="74" height="50" rx="8" fill="#1f5fbf" stroke="#f4f4f2" stroke-width="4"/>
        <text x="{PX + 373}" y="{PY + 140}" font-size="30" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">М-7</text></g>
      <g id="car">
        <path d="M{PX + 215},{PY + 352} l14,-40 q6,-14 22,-14 h72 q16,0 22,14 l14,40 v34 h-144 Z" fill="#c9ced8" stroke="#f4f4f2" stroke-width="3"/>
        <path d="M{PX + 240},{PY + 320} l8,-18 h82 l8,18 Z" fill="#16263a"/>
        <rect x="{PX + 253}" y="{PY + 356}" width="70" height="22" rx="3" fill="#fff" stroke="#0f141c" stroke-width="2"/>
        <text x="{PX + 278}" y="{PY + 373}" font-size="15" font-weight="800" fill="#0f141c" text-anchor="middle" font-family="Montserrat">А123</text>
        <text x="{PX + 312}" y="{PY + 371}" font-size="11" font-weight="800" fill="#0f141c" text-anchor="middle" font-family="Montserrat">116</text>
        <circle cx="{PX + 228}" cy="{PY + 364}" r="7" fill="#ffd27a"/><circle cx="{PX + 346}" cy="{PY + 364}" r="7" fill="#ffd27a"/>
      </g>
    </g>
  </g>"""
lens = """<g id="lens" opacity="0"><circle r="64" fill="#ffffff" fill-opacity="0.08" stroke="#ff8a2a" stroke-width="8"/>
    <path d="M45,45 L92,92" stroke="#ff8a2a" stroke-width="16" stroke-linecap="round"/></g>"""
CX = 700
def chip(i, y, icon, a, b):
    return f"""<g id="chip{i}" opacity="0"><rect x="{CX}" y="{y}" width="480" height="96" rx="22" fill="#1a212c" stroke="#2c3542" stroke-width="2"/>
      {icon(CX + 52, y + 48) if callable(icon) else f'<text x="{CX + 32}" y="{y + 61}" font-size="40" font-family="Montserrat">{icon}</text>'}
      <text x="{CX + 96}" y="{y + 44}" font-size="28" font-weight="800" fill="#fff" font-family="Montserrat">{a}</text>
      <text x="{CX + 96}" y="{y + 76}" font-size="22" font-weight="600" fill="#ff8a2a" font-family="Montserrat">{b}</text></g>"""
shield = lambda x, y: (f'<rect x="{x - 26}" y="{y - 18}" width="52" height="36" rx="6" fill="#1f5fbf" stroke="#f4f4f2" stroke-width="3"/>'
                      f'<text x="{x}" y="{y + 8}" font-size="19" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">М-7</text>')
chips = chip(1, 190, shield, "Знак М-7", "трасса Москва — Уфа") + chip(2, 306, "🚗", "Номер 116", "Татарстан") + chip(3, 422, "🌳", "Берёзы, столбы", "Поволжье")
mapcard = f"""<g id="map" opacity="0">
    <rect x="{CX - 10}" y="160" width="500" height="440" rx="30" fill="#122019" stroke="#f4f4f2" stroke-width="7"/>
    <path d="M{CX + 10},300 C{CX + 140},270 {CX + 300},360 {CX + 470},300 M{CX + 140},180 C{CX + 170},300 {CX + 110},440 {CX + 150},580 M{CX + 360},180 L{CX + 300},580" stroke="#2f4a3b" stroke-width="20" fill="none"/>
    <path d="M{CX + 10},300 C{CX + 140},270 {CX + 300},360 {CX + 470},300" stroke="#ff8a2a" stroke-width="5" fill="none" stroke-dasharray="14 10"/>
    <circle id="radius" cx="{CX + 245}" cy="330" r="90" fill="#ff8a2a" fill-opacity="0.12" stroke="#ff8a2a" stroke-width="3" stroke-dasharray="8 8"/>
  </g>
  <g id="pin" opacity="0"><g transform="translate({CX + 245} 332)"><path d="{PIN}" fill="{ACCENT}" stroke="{BG}" stroke-width="5"/><circle cy="-64" r="13" fill="{BG}"/></g></g>
  <g id="label" opacity="0"><rect x="{CX + 30}" y="470" width="430" height="96" rx="20" fill="#1f2731"/>
    <text x="{CX + 245}" y="510" font-size="31" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">📍 Татарстан, трасса М-7</text>
    <text x="{CX + 245}" y="548" font-size="22" font-weight="600" fill="#3fd27a" text-anchor="middle" font-family="Montserrat">нашёл по 3 подсказкам</text></g>"""
texts = f"""<div style="position:absolute;left:0;right:0;top:50px;text-align:center;font-size:54px;font-weight:800;color:#fff">
    Где снято это фото?</div>
  <div style="position:absolute;left:0;right:0;bottom:46px;text-align:center;font-size:27px;font-weight:600;color:#9aa0aa;letter-spacing:1px">
    GPS · вывески и номера · поиск по картинке · <span style="color:{ACCENT}">ИИ</span></div>"""
WELCOME_DUR = 6.0
# куда смотрит лупа (центр) и когда
SIGN = (PX + 373, PY + 129)
PLATE = (PX + 290, PY + 367)
TREES = (PX + 100, PY + 205)
welcome_tweens = f"""
tl.fromTo('#photo', {{ opacity: 0, scale: 0.94, svgOrigin: '{PX + PW // 2} {PY + PH // 2}' }}, {{ opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }}, 0.05);
tl.set('#lens', {{ x: {PX + 250}, y: {PY + 250} }}, 0);
tl.to('#lens', {{ opacity: 1, duration: 0.2 }}, 0.45);
tl.to('#lens', {{ x: {SIGN[0]}, y: {SIGN[1]}, duration: 0.55, ease: 'power2.inOut' }}, 0.5);
tl.fromTo('#chip1', {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }}, 1.1);
tl.to('#lens', {{ x: {PLATE[0]}, y: {PLATE[1]}, duration: 0.55, ease: 'power2.inOut' }}, 1.45);
tl.fromTo('#chip2', {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }}, 2.05);
tl.to('#lens', {{ x: {TREES[0]}, y: {TREES[1]}, duration: 0.55, ease: 'power2.inOut' }}, 2.4);
tl.fromTo('#chip3', {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }}, 3.0);
tl.to('#lens', {{ opacity: 0, duration: 0.2 }}, 3.45);
tl.to(['#chip1', '#chip2', '#chip3'], {{ opacity: 0, x: -20, duration: 0.25, stagger: 0.05 }}, 3.5);
tl.fromTo('#map', {{ opacity: 0, scale: 0.95, svgOrigin: '{CX + 240} 380' }}, {{ opacity: 1, scale: 1, duration: 0.35 }}, 3.65);
tl.fromTo('#pin', {{ opacity: 0, y: -90 }}, {{ opacity: 1, y: 0, duration: 0.55, ease: 'bounce.out' }}, 3.85);
tl.fromTo('#radius', {{ scale: 0.4, svgOrigin: '{CX + 245} 330' }}, {{ scale: 1, duration: 0.5, ease: 'power2.out' }}, 4.2);
tl.fromTo('#label', {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, 4.3);
tl.to(['#photo', '#map', '#pin', '#label'], {{ opacity: 0, duration: 0.3 }}, {WELCOME_DUR - 0.35});
"""
welcome_html = page("GeoSleuth: приветствие", W, H, WELCOME_DUR,
                    f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}">{road_photo}{chips}{mapcard}{lens}</svg>{texts}',
                    welcome_tweens, "landscape")
(HERE / "welcome" / "index.html").write_text(welcome_html.replace(
    "background: radial-gradient(70% 70% at 50% 45%, #182030 0%, #07090d 100%);", f"background: {BG};"), encoding="utf-8")

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
