/**
 * 06. «Переписка» — новый формат (30.10.2026, вариант 2 по согласованию с Артёмом): ролик-экран телефона.
 * Первый кадр — уже готовая завязка (подпись «Продавец „из Казани“ просит предоплату» и сообщение с фото),
 * дальше сообщения печатаются, экран переезжает в чат с ботом, бот находит место по мелочам, обратно —
 * продавец удаляет профиль, штамп «ДЕНЬГИ ЦЕЛЫ». Конец: «Перед предоплатой проверь фото» → «Бот в био».
 * Серия «Схемы людей», это №1. Рисовка — яркая плоская, не гравюра и не человечки.
 * Музыка — из образца «принцесса на горошине» (первый бит с 7,77 с образца): затишье на 13,58 с — «профиль
 * удалён», дроп на 17,31 с — «Бот в био». Звуки сообщений, свиста, штампа — синтез (`mix06.py`).
 * Подсказки на фото настоящие: номера Киргизии содержат «KG», буквы «ү» и «ө» есть в киргизском алфавите
 * («дүкөн» — магазин), на юге Бишкека видны горы Ала-Тоо.
 */
import { readFileSync } from 'node:fs';
import { C6, ctaIcon, type Video6 } from '../engine6.ts';

const TJ = JSON.parse(readFileSync(new URL('./v06-times.json', import.meta.url), 'utf8')) as { end: number; t: Record<string, number> };
const t = TJ.t;
const END = TJ.end;

// ─── Размеры карточки-экрана ──────────────────────────────────────────────────

const CARD = { x: 60, y: 400, w: 960, h: 1100 };
const HEAD = 124;
const AREA = { top: HEAD, h: 880 };
const GAP = 22;

interface Msg {
  id: string;
  side: 'in' | 'out';
  h: number;
  w: number;
  html: string;
  at: number;
  /** Видно с первого кадра (без анимации появления). */
  fixed?: boolean;
  kind?: 'photo' | 'text';
}

const photo = (u: string) => `<svg viewBox="0 0 560 360" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">
  <defs><linearGradient id="sk${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9be6"/><stop offset="1" stop-color="#d6ebf8"/></linearGradient></defs>
  <rect width="560" height="360" fill="url(#sk${u})"/>
  <path d="M0,205 L64,128 L118,168 L192,82 L262,172 L322,112 L402,58 L474,152 L522,112 L560,152 V240 H0Z" fill="#6c82a0"/>
  <path d="M192,82 L170,114 L192,106 L208,118Z M402,58 L378,94 L400,86 L416,98Z M64,128 L50,148 L64,142 L78,150Z M322,112 L304,138 L322,132 L336,140Z" fill="#fff"/>
  <path d="M0,238 C100,196 180,222 280,210 C400,198 480,220 560,204 V256 H0Z" fill="#4d7355"/>
  <g><rect x="28" y="168" width="156" height="96" fill="#ece3cc"/><rect x="28" y="168" width="156" height="12" fill="#c9bb98"/>
    <rect x="38" y="184" width="136" height="42" rx="5" fill="#1f7a46"/>
    <text x="106" y="214" font-size="26" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat, 'DejaVu Sans', sans-serif">ДҮКӨН</text>
    <rect x="48" y="234" width="34" height="30" fill="#8c7a56"/><rect x="96" y="236" width="68" height="22" fill="#9ec9e8"/></g>
  <g fill="#2f6b3a"><ellipse cx="505" cy="196" rx="14" ry="50"/><ellipse cx="535" cy="204" rx="12" ry="42"/></g>
  <rect x="0" y="256" width="560" height="104" fill="#4a4f58"/>
  <path d="M0,300 H560" stroke="#6b717c" stroke-width="3"/>
  <g stroke="#f4f4f2" stroke-width="5"><path d="M20,330 h40 M100,330 h40 M180,330 h40"/></g>
  <g id="car${u}">
    <rect x="272" y="238" width="196" height="84" rx="20" fill="#cfd4de"/>
    <path d="M298,238 L318,196 H420 L440,238Z" fill="#2b3a4d"/><path d="M326,236 L338,204 H400 L412,236Z" fill="#7da9d6" opacity="0.7"/>
    <circle cx="298" cy="276" r="12" fill="#ffe28a"/><circle cx="442" cy="276" r="12" fill="#ffe28a"/>
    <rect x="326" y="262" width="88" height="14" rx="3" fill="#7d8594"/>
    <rect x="320" y="286" width="100" height="28" rx="4" fill="#fff" stroke="#222" stroke-width="2"/>
    <rect x="320" y="286" width="16" height="28" rx="3" fill="#1a52c4"/>
    <text x="378" y="306" font-size="13" font-weight="800" fill="#111" text-anchor="middle" font-family="Montserrat">01 KG 777 ABC</text>
    <rect x="280" y="312" width="28" height="24" rx="6" fill="#111"/><rect x="432" y="312" width="28" height="24" rx="6" fill="#111"/>
  </g>
  <g fill="none" stroke="${C6.accent}" stroke-width="7">
    <ellipse id="rg1${u}" cx="372" cy="300" rx="72" ry="30" opacity="0"/>
    <ellipse id="rg2${u}" cx="106" cy="198" rx="92" ry="40" opacity="0"/>
    <ellipse id="rg3${u}" cx="300" cy="118" rx="214" ry="62" opacity="0"/>
  </g>
</svg>`;

const mapSvg = `<svg viewBox="0 0 800 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">
  <rect width="800" height="250" fill="#14324a"/>
  <path d="M-20,190 C150,150 260,210 420,160 C560,118 680,170 820,120" stroke="#2a6a9c" stroke-width="30" fill="none"/>
  <g stroke="#223f58" stroke-width="12" fill="none"><path d="M120,0 C150,100 110,190 150,260 M330,0 L300,260 M520,0 C540,90 500,180 560,260 M0,70 H800"/></g>
  <g fill="#1d4263"><rect x="140" y="20" width="150" height="40"/><rect x="350" y="86" width="110" height="50"/><rect x="580" y="20" width="160" height="40"/></g>
  <text x="560" y="228" font-size="28" fill="#8fb0cc" font-family="Montserrat" font-style="italic">Ала-Тоо</text>
  <g id="pin" opacity="0"><g transform="translate(400 156)"><path d="M0,0 C-22,-30 -30,-44 -30,-56 A30,30 0 1 1 30,-56 C30,-44 22,-30 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-56" r="11" fill="#07090d"/></g></g>
</svg>`;

// ─── Чат с продавцом ─────────────────────────────────────────────────────────

const seller: Msg[] = [
  { id: 's1', side: 'in', h: 136, w: 690, at: t.s1, fixed: true, html: 'Камри 2019, 850 000 ₽ 🚗<br>Машина в Казани, срочно!' },
  { id: 's2', side: 'in', h: 372, w: 580, at: t.s2, fixed: true, kind: 'photo', html: photo('A') },
  { id: 's3', side: 'in', h: 136, w: 700, at: t.s3, html: 'Переведите 20 000 ₽ —<br>и я вас забронирую' },
  { id: 'm1', side: 'out', h: 136, w: 640, at: t.m1, html: 'Фото свежее?<br>Покажете вживую?' },
  { id: 's4', side: 'in', h: 136, w: 700, at: t.s4, html: 'Конечно! Только сначала<br>предоплата 🙏' },
  { id: 'm2', side: 'out', h: 90, w: 520, at: t.m2, html: 'Секунду, проверю фото' },
  { id: 'm3', side: 'out', h: 90, w: 560, at: t.m3, html: 'Это Бишкек, не Казань 🙃' },
  { id: 'n1', side: 'in', h: 76, w: 560, at: t.notice, html: 'Продавец удалил профиль' },
];

// ─── Чат с ботом ──────────────────────────────────────────────────────────────

const bot: Msg[] = [
  { id: 'b0', side: 'out', h: 352, w: 560, at: t.bphoto, kind: 'photo', html: photo('B') },
  { id: 'bt', side: 'in', h: 84, w: 150, at: t.typing, html: '<span class="dots"><i></i><i></i><i></i></span>' },
  { id: 'ba', side: 'in', h: 262, w: 820, at: t.btitle, html:
    '<div class="bl" id="bl0"><b>🔎 Нашёл подсказки:</b></div><div class="bl" id="bl1">• номер <b>KG</b> — Кыргызстан</div>' +
    '<div class="bl" id="bl2">• буквы «ү», «ө» — киргизский</div><div class="bl" id="bl3">• горы <b>Ала-Тоо</b> на горизонте</div>' },
  { id: 'br', side: 'in', h: 396, w: 820, at: t.result, kind: 'photo', html:
    `<div class="rt">📍 <b>Бишкек, Кыргызстан</b></div><div class="rm">${mapSvg}</div><div class="rc">уверенность: высокая</div>` },
];

interface Placed extends Msg { top: number }
const place = (list: Msg[], skip: string[] = []): { items: Placed[]; steps: { at: number; y: number }[] } => {
  let top = 12;
  const items: Placed[] = [];
  for (const m of list) {
    items.push({ ...m, top });
    if (!skip.includes(m.id)) top += m.h + GAP;
  }
  return { items, steps: [] };
};
// «набирает…» занимает место ответа бота: ответ ложится на тот же top
const sellerP = place(seller);
const botLay = (() => {
  const items: Placed[] = [];
  let top = 12;
  for (const m of bot) {
    if (m.id === 'ba') {
      items.push({ ...m, top });
      top += m.h + GAP;
    } else if (m.id === 'bt') {
      items.push({ ...m, top }); // тот же top, что у ответа
    } else {
      items.push({ ...m, top });
      top += m.h + GAP;
    }
  }
  return items;
})();
// ответ бота лежит на том же месте, что «набирает…»: пересчитаем top для br и ba
{
  const b0 = botLay.find((m) => m.id === 'b0')!;
  const bt = botLay.find((m) => m.id === 'bt')!;
  const ba = botLay.find((m) => m.id === 'ba')!;
  const br = botLay.find((m) => m.id === 'br')!;
  bt.top = b0.top + b0.h + GAP;
  ba.top = bt.top;
  br.top = ba.top + ba.h + GAP;
}

const bubble = (m: Placed) =>
  `<div class="m ${m.side} ${m.kind ?? ''}" id="${m.id}" style="top:${m.top}px;height:${m.h}px;width:${m.w}px">${m.html}</div>`;

/** Прокрутка ленты: низ последнего сообщения не ниже края области. */
const scrollFor = (list: Placed[], upTo: number) => {
  const bottom = Math.max(...list.filter((m) => m.at <= upTo).map((m) => m.top + m.h));
  return Math.min(0, AREA.h - 24 - bottom);
};

// ─── Анимации ─────────────────────────────────────────────────────────────────

const tw: string[] = [];
const appear = (m: Placed) => {
  if (m.fixed) return;
  const origin = m.side === 'in' ? '0% 100%' : '100% 100%';
  tw.push(`tl.fromTo('#${m.id}', { opacity: 0, y: 36, scale: 0.9, transformOrigin: '${origin}' }, { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'back.out(1.7)' }, ${m.at});`);
};
const scrollSteps = (trackId: string, list: Placed[], firstScrollAt = 0) => {
  let prev = 0;
  const times = [...new Set(list.map((m) => m.at))].sort((a, b) => a - b);
  for (const at of times) {
    if (at < firstScrollAt) continue;
    const y = scrollFor(list, at);
    if (y !== prev) {
      tw.push(`tl.fromTo('#${trackId}', { y: ${prev} }, { y: ${y}, duration: 0.3, ease: 'power2.out', immediateRender: false }, ${at});`);
      prev = y;
    }
  }
};
sellerP.items.forEach(appear);
botLay.forEach((m) => { if (m.id !== 'bt' && m.id !== 'ba') appear(m); });
scrollSteps('trackA', sellerP.items);
// лента бота: «набирает…» и ответ делят место, прокручиваем по появлению ответа/результата
tw.push(`tl.fromTo('#trackB', { y: 0 }, { y: ${scrollFor(botLay.filter((m) => m.id !== 'bt'), t.result)}, duration: 0.3, ease: 'power2.out', immediateRender: false }, ${t.result});`);

// «набирает…» → ответ на том же месте
tw.push(`tl.fromTo('#bt', { opacity: 0, y: 30, scale: 0.9, transformOrigin: '0% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.22 }, ${t.typing});`);
tw.push(`tl.to('.dots i', { y: -9, duration: 0.2, stagger: 0.12, yoyo: true, repeat: 4, ease: 'sine.inOut' }, ${t.typing + 0.1});`);
tw.push(`tl.set('#bt', { opacity: 0 }, ${t.btitle});`);
tw.push(`tl.fromTo('#ba', { opacity: 0, y: 30, scale: 0.92, transformOrigin: '0% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'back.out(1.5)' }, ${t.btitle});`);
tw.push(`tl.set('#bl1, #bl2, #bl3', { opacity: 0 }, 0);`);
[['bl1', t.b1], ['bl2', t.b2], ['bl3', t.b3]].forEach(([id, at]) =>
  tw.push(`tl.fromTo('#${id}', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power2.out' }, ${at});`));
// кружки на фото в чате бота (подсвечивают найденное)
[['rg1B', t.b1], ['rg2B', t.b2], ['rg3B', t.b3]].forEach(([id, at]) => {
  tw.push(`tl.fromTo('#${id}', { opacity: 0, scale: 1.35, svgOrigin: '300 180' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, ${at});`);
  tw.push(`tl.to('#${id}', { opacity: 0.35, duration: 0.3 }, ${(at as number) + 0.9});`);
});
tw.push(`tl.fromTo('#pin', { opacity: 0, y: -90 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, ${t.pin});`);

// переезд между чатами
tw.push(`tl.fromTo('#slider', { x: 0 }, { x: -${CARD.w}, duration: 0.38, ease: 'power3.inOut' }, ${t.slideB});`);
tw.push(`tl.fromTo('#slider', { x: -${CARD.w} }, { x: 0, duration: 0.38, ease: 'power3.inOut', immediateRender: false }, ${t.slideA});`);
// шапка продавца: статус меняется
tw.push(`tl.set('#stA1', { opacity: 0 }, ${t.notice}); tl.set('#stA2', { opacity: 1 }, ${t.notice});`);
// штамп на затишье в музыке
tw.push(`tl.fromTo('#stamp', { opacity: 0, scale: 2.4, rotation: -2, xPercent: -50 }, { opacity: 1, scale: 1, rotation: -9, xPercent: -50, duration: 0.2, ease: 'power4.in' }, ${t.stamp});`);
[[0, -14], [-14, 12], [12, -8], [-8, 5], [5, 0]].forEach(([from, to], i) =>
  tw.push(`tl.fromTo('#card', { x: ${from} }, { x: ${to}, duration: 0.07, ease: 'none', immediateRender: false }, ${(t.stamp + 0.2 + i * 0.07).toFixed(2)});`));
tw.push(`tl.set('#flash', { opacity: 0.35 }, ${t.stamp + 0.2}); tl.to('#flash', { opacity: 0, duration: 0.3 }, ${t.stamp + 0.23});`);
// карточка уходит
tw.push(`tl.to('#card', { opacity: 0, y: 60, scale: 0.94, duration: 0.35, ease: 'power2.in' }, ${t.endtext - 0.35});`);
// свечение фона: красное → оранжевое → зелёное
tw.push(`tl.fromTo('#glow2', { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${t.slideB});`);
tw.push(`tl.fromTo('#glow3', { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${t.slideA});`);
// подписи сверху
tw.push(`tl.fromTo('#cap2', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${t.slideB + 0.1});`);
tw.push(`tl.fromTo('#cap3', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${t.slideA + 0.1});`);
// конец: две строки, «Бот в био» на дроп
tw.push(`tl.fromTo('#e1', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, ${t.endtext});`);
tw.push(`tl.fromTo('#e2', { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${t.endtext2});`);
tw.push(`tl.to('#e2', { scale: 1.06, duration: 0.5, yoyo: true, repeat: 2, ease: 'sine.inOut' }, ${t.endtext2 + 0.4});`);
tw.push(`tl.set('#flash', { opacity: 0.9 }, ${t.cta}); tl.to('#flash', { opacity: 0, duration: 0.3 }, ${t.cta + 0.03});`);
tw.push(`tl.fromTo('#ctaIcon', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, ${t.cta});`);
tw.push(`tl.fromTo('#ctaText', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, ${t.cta + 0.1});`);
tw.push(`tl.fromTo('#ctaSub', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${t.cta + 0.4});`);
tw.push(`tl.to('#ctaIcon', { scale: 1.07, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, ${t.cta + 0.4});`);

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';

const header = (avatar: string, name: string, status: string) => `
  <div class="hd"><div class="back">‹</div>${avatar}<div class="hn"><b>${name}</b><span>${status}</span></div></div>`;
const inputBar = (placeholder: string) => `<div class="inp"><div class="ph">${placeholder}</div><div class="send">➤</div></div>`;

const avatarSeller = `<div class="av" style="background:#59616e"><svg viewBox="-30 -30 60 60" width="60" height="60"><circle cy="-8" r="11" fill="#cfd3da"/><path d="M-18,22 C-18,6 18,6 18,22Z" fill="#cfd3da"/></svg></div>`;
const avatarBot = `<div class="av" style="background:#1f2630;border:3px solid ${C6.accent}"><svg viewBox="-30 -30 60 60" width="60" height="60"><path d="M0,22 C-14,4 -18,-4 -18,-9 A18,18 0 1 1 18,-9 C18,-4 14,4 0,22Z" fill="${C6.accent}"/><circle cy="-9" r="6" fill="#1f2630"/></svg></div>`;

export const v06: Video6 = {
  id: '06-perepiska',
  title: 'GeoBot: Переписка — схема №1',
  end: END,
  body: `
      <style>
        #bg { position: absolute; inset: 0; background: #080b11; }
        .glow { position: absolute; inset: 0; }
        #glow1 { background: radial-gradient(70% 45% at 50% 42%, #4a1520 0%, rgba(8,11,17,0) 70%); }
        #glow2 { background: radial-gradient(70% 45% at 50% 42%, #4d3012 0%, rgba(8,11,17,0) 70%); opacity: 0; }
        #glow3 { background: radial-gradient(70% 45% at 50% 42%, #123f2a 0%, rgba(8,11,17,0) 70%); opacity: 0; }
        #card { position: absolute; left: ${CARD.x}px; top: ${CARD.y}px; width: ${CARD.w}px; height: ${CARD.h}px; border-radius: 56px; overflow: hidden; background: #0f1621; box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 3px #2a3444; }
        #slider { position: absolute; left: 0; top: 0; width: ${CARD.w * 2}px; height: ${CARD.h}px; }
        .scr { position: absolute; top: 0; width: ${CARD.w}px; height: ${CARD.h}px; }
        #scrA { left: 0; } #scrB { left: ${CARD.w}px; }
        .hd { position: absolute; left: 0; right: 0; top: 0; height: ${HEAD}px; background: #17212d; display: flex; align-items: center; gap: 18px; padding: 0 28px; z-index: 3; box-shadow: 0 2px 0 #0b1018; }
        .back { font-size: 64px; color: #7fa7e8; font-weight: 300; line-height: 1; margin-right: -2px; }
        .av { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
        .hn { display: flex; flex-direction: column; position: relative; height: 80px; justify-content: center; gap: 2px; }
        .hn b { font-size: 34px; color: #fff; font-weight: 700; letter-spacing: 0; }
        .hn .st { display: block; position: relative; height: 30px; font-size: 24px; color: #7d8aa0; font-weight: 500; }
        .hn .st i { position: absolute; left: 0; top: 0; font-style: normal; white-space: nowrap; }
        .area { position: absolute; left: 0; right: 0; top: ${AREA.top}px; height: ${AREA.h}px; overflow: hidden; -webkit-mask-image: linear-gradient(#0000, #000 40px); mask-image: linear-gradient(#0000, #000 40px); }
        .track { position: absolute; left: 0; top: 0; right: 0; }
        .m { position: absolute; box-sizing: border-box; border-radius: 34px; padding: 20px 26px; font-size: 36px; line-height: 1.26; font-weight: 600; color: #fff; overflow: hidden; }
        .m.in { left: 24px; background: #212d3b; border-bottom-left-radius: 8px; }
        .m.out { right: 24px; background: #2c6ad6; border-bottom-right-radius: 8px; }
        .m.photo { padding: 8px; border-radius: 30px; }
        .m.photo > svg { border-radius: 22px; width: 100%; height: 100%; }
        .m.photo.in.rt-wrap { padding: 8px; }
        #br { padding: 18px 18px 14px; display: flex; flex-direction: column; gap: 10px; }
        #br .rt { font-size: 36px; padding-left: 8px; }
        #br .rm { flex: 1; border-radius: 22px; overflow: hidden; min-height: 0; }
        #br .rc { font-size: 26px; color: #3fd27a; font-weight: 700; padding-left: 8px; }
        #n1 { left: 50%; right: auto; margin-left: -280px; background: #3a1c24; color: #ff9aa6; font-size: 30px; text-align: center; padding-top: 18px; border-radius: 38px; }
        .bl { font-size: 36px; line-height: 1.3; height: 46px; white-space: nowrap; }
        #ba { padding-top: 22px; }
        .dots { display: flex; gap: 12px; height: 44px; align-items: center; padding-left: 4px; }
        .dots i { width: 18px; height: 18px; border-radius: 50%; background: #9aa6ba; display: block; }
        .inp { position: absolute; left: 0; right: 0; bottom: 0; height: ${CARD.h - AREA.top - AREA.h}px; background: #17212d; display: flex; align-items: center; gap: 18px; padding: 0 26px; }
        .ph { flex: 1; height: 72px; border-radius: 36px; background: #0f1621; color: #5d6b82; font-size: 30px; display: flex; align-items: center; padding-left: 28px; }
        .send { width: 72px; height: 72px; border-radius: 50%; background: #2c6ad6; color: #fff; font-size: 32px; display: flex; align-items: center; justify-content: center; }
        #stamp { position: absolute; left: 50%; top: 540px; padding: 14px 30px; border: 10px solid ${C6.green}; border-radius: 22px; color: ${C6.green}; font-size: 62px; font-weight: 900; letter-spacing: 3px; background: rgba(9,20,16,0.82); opacity: 0; z-index: 6; white-space: nowrap; }
        .cap { position: absolute; left: 50px; right: 50px; text-align: center; font-weight: 800; font-size: 56px; line-height: 1.18; color: #fff; text-shadow: 0 3px 18px rgba(0,0,0,0.9); }
        #cap1 { top: 215px; } #cap2, #cap3 { top: 215px; }
        #cap2, #cap3 { opacity: 0; }
        .badge { position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 5px; color: ${C6.accent}; }
        .endBox { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 220px; text-align: center; font-weight: 800; font-size: 86px; line-height: 1.12; color: #fff; }
        #e1, #e2 { opacity: 0; }
        #e2 { color: ${C6.accent}; margin-top: 18px; }
        #ctaSub { margin-top: 26px; font-size: 34px; color: #9aa6ba; font-weight: 600; opacity: 0; }
      </style>
      <div id="bg"></div>
      <div class="glow" id="glow1"></div><div class="glow" id="glow2"></div><div class="glow" id="glow3"></div>
      <div class="clip badge" data-start="0" data-duration="${t.endtext.toFixed(2)}">СХЕМЫ ЛЮДЕЙ · №1 · «МАШИНА В КАЗАНИ»</div>
      <div class="clip" data-start="0" data-duration="${t.endtext.toFixed(2)}" style="position:absolute;inset:0">
        <div id="card">
          <div id="slider">
            <div class="scr" id="scrA">
              ${header(avatarSeller, 'Продавец · Toyota Camry', '<span class="st"><i id="stA1">был(а) 3 минуты назад</i><i id="stA2" style="opacity:0;color:#ff7a86">аккаунт удалён</i></span>')}
              <div class="area"><div class="track" id="trackA">${sellerP.items.map(bubble).join('')}</div></div>
              ${inputBar('Сообщение')}
            </div>
            <div class="scr" id="scrB">
              ${header(avatarBot, 'GeoSleuth', '<span class="st"><i>бот · ищет место по фото</i></span>')}
              <div class="area"><div class="track" id="trackB">${botLay.map(bubble).join('')}</div></div>
              ${inputBar('Пришлите фото')}
            </div>
          </div>
          <div id="stamp">ДЕНЬГИ ЦЕЛЫ ✅</div>
        </div>
      </div>
      <div class="clip cap" id="cap1" data-start="0" data-duration="${t.slideB.toFixed(2)}">Продавец «из Казани»<br>просит предоплату 👀</div>
      <div class="clip cap" id="cap2" data-start="${t.slideB.toFixed(2)}" data-duration="${(t.slideA - t.slideB).toFixed(2)}">Бот смотрит<br>на мелочи на фото</div>
      <div class="clip cap" id="cap3" data-start="${t.slideA.toFixed(2)}" data-duration="${(t.endtext - t.slideA).toFixed(2)}">Продавец сразу<br>удалился 😏</div>
      <div class="clip" data-start="${t.endtext.toFixed(2)}" data-duration="${(t.cta - t.endtext).toFixed(2)}" style="position:absolute;inset:0">
        <div class="endBox"><div id="e1">Перед предоплатой</div><div id="e2">проверь фото.</div></div>
      </div>
      <div class="clip" data-start="${t.cta.toFixed(2)}" data-duration="${(END - t.cta).toFixed(2)}" style="position:absolute;inset:0;background:#000">
        <div class="endBox" style="font-weight:400;font-size:56px">
          <div id="ctaIcon" style="width:230px;height:230px;opacity:0">${ctaIcon(ctaGlyph)}</div>
          <div id="ctaText" style="margin-top:30px;opacity:0">Бот в био</div>
          <div id="ctaSub">GeoSleuth · 3 фото в день бесплатно</div>
        </div>
      </div>`,
  tweens: tw.join('\n      '),
};
