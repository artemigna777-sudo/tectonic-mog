"""Format a Report as Telegram HTML messages."""

from html import escape

from .analyze import Report

CONF = {"high": "высокая", "medium": "средняя", "low": "низкая"}


def _km(r: float) -> str:
    return f"~{int(r * 1000)} м" if r < 1 else f"~{r:g} км"


def summary(rep: Report) -> str:
    out: list[str] = []
    b = rep.best
    if b:
        out.append(f"📍 <b>{escape(b.label)}</b>")
        out.append(f"Координаты: <code>{b.lat:.5f}, {b.lon:.5f}</code> (погрешность {_km(b.radius_km)})")
        out.append(f"Уверенность: <b>{CONF.get(b.confidence, b.confidence)}</b> · источник: {escape(b.source)}")
        if rep.address:
            out.append(f"Адрес рядом: {escape(rep.address)}")
    else:
        out.append("🤷 <b>Точку определить не удалось.</b> Попробуйте кнопки поиска ниже — "
                   "Яндекс часто узнаёт здания и храмы.")

    m = rep.meta
    facts = []
    if m.taken_at:
        facts.append(f"снято {escape(m.taken_at)}{' (UTC' + escape(m.utc_offset) + ')' if m.utc_offset else ''}")
    if m.direction is not None:
        facts.append(f"камера смотрела на азимут {m.direction:g}°")
    if m.camera:
        facts.append(escape(m.camera))
    if facts:
        out.append("\n🗂 <b>Метаданные:</b> " + "; ".join(facts))
    elif rep.compressed:
        out.append("\n🗂 Метаданных нет: Telegram удаляет их у сжатых фото. "
                   "Отправьте фото <b>файлом</b> (📎 → Файл), там часто есть GPS.")
    else:
        out.append("\n🗂 Метаданных в файле нет.")

    if rep.clues:
        out.append("\n🔎 <b>Найдено в тексте на фото:</b>")
        out += [f"• {escape(c.text)} → <b>{escape(c.place)}</b>" for c in rep.clues[:12]]

    ya = rep.yandex
    if ya and (ya.tags or ya.sites):
        out.append("\n🔍 <b>Яндекс нашёл:</b>")
        if ya.tags:
            out.append("• похоже на: " + escape(", ".join(ya.tags[:4])))
        key = (rep.best.label.split(", ")[-1].lower() if rep.best else "")
        sites = sorted(ya.sites, key=lambda st: key not in (st["title"] + " " + st["description"]).lower())
        for site in sites[:3]:
            out.append(f"• {escape(site['title'][:90])}")

    g = rep.gemini
    if g:
        where = ", ".join(str(g[k]) for k in ("place", "city", "region", "country") if g.get(k) and str(g[k]) != "null")
        out.append(f"\n🤖 <b>Gemini:</b> {escape(where or 'не уверен')} "
                   f"(уверенность {CONF.get(g.get('confidence'), '?')})")
        for c in (g.get("clues") or [])[:6]:
            out.append(f"• {escape(str(c))}")

    if rep.ocr_text:
        text = rep.ocr_text.strip().replace("\n", " · ")
        out.append(f"\n📝 Текст на фото: <i>{escape(text[:300])}{'…' if len(text) > 300 else ''}</i>")
    if rep.notes:
        out.append("\n⚠️ " + "\n⚠️ ".join(escape(n) for n in rep.notes))
    return "\n".join(out)[:4000]


def dossier(rep: Report) -> str:
    """Plain text the user can paste into a chat assistant together with the photo."""
    lines = ["Где снято это фото? Вот что уже известно:"]
    m = rep.meta
    if m.taken_at:
        lines.append(f"- время съёмки: {m.taken_at} {m.utc_offset or ''}".rstrip())
    if m.direction is not None:
        lines.append(f"- камера смотрела на азимут {m.direction:g}°")
    if rep.ocr_text:
        lines.append("- текст на фото: " + rep.ocr_text.replace("\n", " | ")[:600])
    for c in rep.clues:
        lines.append(f"- {c.text} → {c.place}")
    if rep.yandex:
        if rep.yandex.tags:
            lines.append("- Яндекс: похоже на " + ", ".join(rep.yandex.tags[:5]))
        for site in rep.yandex.sites[:5]:
            lines.append(f"- страница с этим фото: {site['title']}")
    if rep.best:
        lines.append(f"- предварительно: {rep.best.label} ({rep.best.lat:.4f}, {rep.best.lon:.4f}), "
                     f"уверенность {CONF.get(rep.best.confidence)}")
    lines.append("Посмотри на архитектуру, растительность, знаки, солнце и тени. "
                 "Назови страну, регион, город и конкретное место, координаты и насколько ты уверен.")
    return "\n".join(lines)
