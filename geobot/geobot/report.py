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
        out.append(f"\n🤖 <b>Gemini</b> (уверенность {CONF.get(g.get('confidence'), '?')}):")
        if g.get("confidence_claimed"):
            out.append(f"  ↳ Gemini считал уверенность {CONF.get(g['confidence_claimed'])}, но ни текст на фото, "
                       "ни поиск по картинке этого не подтверждают — поэтому точный адрес не ставлю.")
        for i, c in enumerate(g.get("candidates") or [], 1):
            where = ", ".join(x for x in (c.get("place"), c.get("city"), c.get("region"), c.get("country")) if x)
            out.append(f"{i}. {escape(where[:90])} — <b>{c.get('probability', 0):g}%</b>")
        if rep.details:
            out.append("🔬 Рассмотрел крупно: " + escape(", ".join(rep.details)))
        for c in (g.get("clues") or [])[:6]:
            out.append(f"• {escape(str(c)[:160])}")
        for src in (g.get("sources") or [])[:3]:
            out.append(f"🌐 Проверял в Google: {escape((src.get('title') or src.get('uri') or '')[:80])}")

    if rep.ocr_text:
        text = rep.ocr_text.strip().replace("\n", " · ")
        out.append(f"\n📝 Текст на фото: <i>{escape(text[:300])}{'…' if len(text) > 300 else ''}</i>")
    if rep.notes:
        out.append("\n⚠️ " + "\n⚠️ ".join(escape(n) for n in rep.notes))
    out.append("\n✍️ Знаете, где это? Ответьте на это сообщение: <code>/ответ город, улица</code> "
               "(или пришлите геопозицию) — посчитаю ошибку.")
    text = "\n".join(out)
    while len(text) > 4000 and len(out) > 3:  # Telegram limit; drop whole lines so HTML tags stay closed
        out.pop(-2)
        text = "\n".join(out)
    return text


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
    for c in (rep.gemini or {}).get("candidates") or []:
        where = ", ".join(x for x in (c.get("place"), c.get("city"), c.get("region"), c.get("country")) if x)
        lines.append(f"- вариант Gemini: {where} ({c.get('probability', 0):g}%)")
    if rep.best:
        lines.append(f"- предварительно: {rep.best.label} ({rep.best.lat:.4f}, {rep.best.lon:.4f}), "
                     f"уверенность {CONF.get(rep.best.confidence)}")
    lines.append("Посмотри на архитектуру, растительность, знаки, солнце и тени. "
                 "Назови страну, регион, город и конкретное место, координаты и насколько ты уверен.")
    return "\n".join(lines)
