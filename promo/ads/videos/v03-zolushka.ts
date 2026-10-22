/**
 * 03. «Нашёл квартиру в центре Казани. Почти даром» — по четырём образцам Артёма от 22.10.2026 (автор с похожим
 * продуктом: «Как Даниил жрецов — по следам в пепле», «Как королева Белоснежку — спроси у зеркальца»…).
 * Формат образцов, 25 с: 4 реплики светящихся человечков с телефонами (у нас они двигаются, `engine6.ts`) →
 * сказка на гравюрах, кадр меняется на каждый бит (0,433 с) → инфографика «Спросим у бота» с оранжевым штампом →
 * вывод из двух строк → «Бот в био». Музыка — из образца «принцесса на горошине» (136 BPM): тихое вступление под
 * диалог, дроп на 7,9 с — начало сказки, затишье на 21,3 с — вывод.
 * Сюжет: проверить объявление о квартире по фото. За окном море и горы, у машины номер GE — это Батуми, не Казань.
 */
import { C, ETCH, PATTERNS, svgLines } from '../engine3.ts';
import {
  C6, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';
import { column, fig, figPts, front, rng, sh, wh, type FigOpts } from '../etch.ts';

const END = 25.0;
const T = { story: 7.77, s2: 10.37, s3: 12.97, s3b: 14.27, info: 15.57, cta: 21.33, cta2: 22.0, bio: 22.9 };
const BEAT = 0.4333;

// ─── Диалог: ночная кухня, белые линии на чёрном ─────────────────────────────

const FLOOR = 1500;
const A = figure({ id: 'A', x: 320, pose: 'stand', floor: FLOOR, hair: 'spiky', face: 'happy', phone: 'R', phoneRot: -138 });
const B = figure({ id: 'B', x: 770, pose: 'stand', floor: FLOOR, hair: 'curly', face: 'neutral', phone: 'L', phoneRot: 138 });

const kitchen = `
  <g stroke="#cfd3da" stroke-width="4" opacity="0.85">
    <path d="M-400,${FLOOR} H1480"/>
    <rect x="80" y="560" width="340" height="400"/><path d="M250,560 V960 M80,760 H420"/>
    <path d="M380,620 a34,34 0 1 0 0.1,0" stroke-width="3"/>
    <path d="M540,300 V560 M480,560 h120 l-20,46 h-80 z"/>
    <rect x="900" y="760" width="230" height="740"/><path d="M900,1050 H1130 M925,860 v120 M925,1100 v160"/>
    <path d="M-60,1200 H560 M-40,1200 V${FLOOR} M540,1200 V${FLOOR} M-60,1230 H560"/>
    <path d="M120,1200 v-60 h50 v60 M300,1200 v-34 q20,-20 40,0 v34"/>
  </g>
  ${A.svg}${B.svg}`;

// ─── Гравюры: Золушка ─────────────────────────────────────────────────────────

const P = C.paper;
/** Хрустальная туфелька, носок вправо: (x, y) — середина подошвы. */
const slipper = (x: number, y: number, k = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${k})">
    ${wh('M-70,0 C-74,-34 -40,-54 -6,-46 C28,-38 58,-16 78,-2 C86,4 80,10 70,10 L-56,10 C-66,10 -70,6 -70,0 Z', 'stroke-width="5"')}
    ${sh('M-70,0 C-72,-22 -54,-36 -36,-38 L-30,10 L-56,10 C-66,10 -70,6 -70,0 Z', 'c60', 'stroke-width="3"')}
    <path d="M-60,10 L-64,46 M-50,10 L-54,46" stroke-width="5"/>
    <path d="M-20,-36 L4,-6 M8,-32 L30,-8 M36,-22 L50,-6" stroke-width="2.5"/>
    <path d="M-30,-60 l6,-16 l6,16 l16,6 l-16,6 l-6,16 l-6,-16 l-16,-6 z M90,-40 l4,-10 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 z" fill="${P}" stroke-width="2.5"/>
  </g>`;

const tiles = (y0: number) => {
  let d = '';
  for (let i = -8; i <= 8; i++) d += `M${540 + i * 60},${y0} L${540 + i * 260},2400 `;
  for (let y = y0, s = 30; y < 2400; y += s, s *= 1.35) d += `M-400,${y.toFixed(0)} H1480 `;
  return `<rect x="-400" y="${y0}" width="1880" height="${2400 - y0}" fill="${P}" stroke="none"/>
    <rect x="-400" y="${y0}" width="1880" height="${2400 - y0}" fill="url(#c0)" stroke="none" opacity="0.6"/><path d="${d}" stroke-width="2.5"/>`;
};

const hall = (y0: number) => `
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="${P}" stroke="none"/>
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="url(#c90)" stroke="none" opacity="0.8"/>
  ${column(120, 260, y0)}${column(960, 260, y0)}
  <path d="M190,290 Q540,40 890,290" stroke-width="6"/><path d="M190,330 Q540,90 890,330" stroke-width="3"/>`;

/** Часы: обе стрелки на полночь. */
const clock = (x: number, y: number, r: number) => `
  <circle cx="${x}" cy="${y}" r="${r + 18}" fill="${P}" stroke-width="6"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#c30)" stroke-width="3"/>
  <circle cx="${x}" cy="${y}" r="${r - 26}" fill="${P}" stroke-width="2"/>
  ${Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<path d="M${(x + Math.sin(a) * (r - 8)).toFixed(0)},${(y - Math.cos(a) * (r - 8)).toFixed(0)} L${(x + Math.sin(a) * (r - 22)).toFixed(0)},${(y - Math.cos(a) * (r - 22)).toFixed(0)}" stroke-width="${i % 3 ? 3 : 7}"/>`;
  }).join('')}
  <path d="M${x},${y} V${y - r + 40} M${x - 6},${y} V${y - r + 70}" stroke-width="8"/><circle cx="${x}" cy="${y}" r="10" fill="${C.ink}"/>`;

const stairs = (() => {
  let out = '';
  for (let i = 0; i < 9; i++) {
    const y = 1060 + i * 80 + i * i * 4;
    const half = 240 + i * 70;
    out += sh(`M${540 - half},${y} H${540 + half} V${y + 44 + i * 4} H${540 - half} Z`, i % 2 ? 'a0' : 'b0', 'stroke-width="3"');
    out += wh(`M${540 - half},${y + 44 + i * 4} H${540 + half} V${y + 80 + i * 8} H${540 - half} Z`, 'stroke-width="3"');
  }
  return out;
})();

const gown: FigOpts = { x: 0, y: 0, dress: 'gown', pat: 'a120', sleeve: 'c60', hair: 'long' };
const prince: FigOpts = { x: 0, y: 0, dress: 'coat', pat: 'b60', sleeve: 'b60', legs: 'a0', hair: 'crown' };

const img1 = `${hall(1060)}${clock(540, 560, 160)}${stairs}
  ${fig({ ...gown, x: 330, y: 905, s: 0.7, f: -1, lean: 14, leg: [30, 40], leg2: [-24, 10], arm: [60, 30], arm2: [-30, 10], face: 'calm' })}
  ${slipper(610, 1404, 1.2, -4)}`;

const queue = [720, 830, 940, 1050, 1160].map((x, i) =>
  front({ x, y: 1210 - i * 6, s: 0.62 - i * 0.03, dress: 'robe', pat: ['a60', 'c30', 'b120', 'a150', 'c90'][i], hair: (['long', 'curly', 'short', 'long', 'curly'] as const)[i] })).join('');
const img2 = `${hall(1300)}${tiles(1300)}${queue}
  ${fig({ ...prince, x: 360, y: 1470, f: 1, leg: [0, 90], leg2: [6, 92], arm: [86, 6], arm2: [70, 20], hand: slipper(46, -6, 0.55, 0), face: 'calm' })}
  ${fig({ ...gown, pat: 'a30', x: 700, y: 1390, f: -1, leg: [90, 50], leg2: [90, 90], arm: [20, 30], arm2: [10, 10], face: 'closed' })}
  ${sh('M600,1394 H820 V1414 H600 Z M620,1414 V1560 M800,1414 V1560', 'b0', 'stroke-width="4"')}`;

const rays = (() => {
  const r = rng(3);
  let d = '';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r1 = 70;
    const r2 = 120 + r() * 90;
    d += `M${(Math.cos(a) * r1).toFixed(0)},${(Math.sin(a) * r1).toFixed(0)} L${(Math.cos(a) * r2).toFixed(0)},${(Math.sin(a) * r2).toFixed(0)} `;
  }
  return d;
})();
const CIND: FigOpts = { x: 740, y: 1296, f: -1, dress: 'dress', pat: 'hd', sleeve: 'c90', hair: 'kerchief', leg: [90, 30], leg2: [90, 88], arm: [30, 40], arm2: [10, 20], nod: 12, face: 'calm' };
const FOOT = figPts(CIND).toe; // туфелька — на вытянутой ноге
const img3 = `${hall(1300)}${tiles(1300)}
  <g transform="translate(${FOOT[0] - 10} ${FOOT[1]})"><circle r="150" fill="${P}" stroke="none"/><path d="${rays}" stroke-width="3"/></g>
  ${fig({ ...prince, x: 330, y: 1470, f: 1, leg: [0, 90], leg2: [6, 92], arm: [110, 20], arm2: [80, 30], nod: -16, face: 'calm' })}
  ${sh('M640,1300 H860 V1320 H640 Z M660,1320 V1560 M840,1320 V1560', 'b0', 'stroke-width="4"')}
  ${fig(CIND)}
  ${slipper(FOOT[0] - 10, FOOT[1] + 6, 0.62, 30)}`;

/** Кадры сказки: каждый бит — новая крупность. */
const crops: Record<number, [number, number, number][]> = {
  1: [[540, 960, 1.0], [540, 600, 1.7], [600, 1380, 2.3], [330, 860, 2.0], [540, 1150, 1.25], [610, 1400, 3.0]],
  2: [[600, 1200, 1.05], [360, 1180, 2.0], [940, 1060, 1.9], [460, 1360, 2.4], [700, 1250, 1.8], [560, 1300, 1.3]],
  3: [[560, 1250, 1.05], [FOOT[0], FOOT[1], 2.6], [740, 1120, 2.0], [330, 1200, 2.0], [FOOT[0] - 40, FOOT[1] - 40, 1.9], [560, 1300, 1.2]],
};
const storyShots: { img: number; t: number; fx: number; fy: number; s: number }[] = [];
([[1, T.story, T.s2], [2, T.s2, T.s3], [3, T.s3, T.info]] as const).forEach(([img, t0, t1]) => {
  let k = 0;
  for (let t = t0; t < t1 - 0.05; t += BEAT, k++) {
    const [fx, fy, s] = crops[img][k % crops[img].length];
    storyShots.push({ img, t, fx, fy, s });
  }
});
const labels = [
  { t0: T.story, t1: T.s2, text: 'На балу осталась одна туфелька' },
  { t0: T.s2, t1: T.s3, text: 'Принц примерил её всем девушкам' },
  { t0: T.s3, t1: T.s3b, text: 'Подошла только одной' },
  { t0: T.s3b, t1: T.info, text: 'Мелочь нашла хозяйку' },
];
const camAt = (fx: number, fy: number, s: number) => ({ x: 540 - fx * s, y: 960 - fy * s, scale: s });
const storyTweens = [
  ...storyShots.map((k, i) => {
    const t1 = storyShots[i + 1]?.t ?? T.info;
    return `tl.set('.gimg', { opacity: 0 }, ${k.t.toFixed(3)}); tl.set('#g${k.img}', { opacity: 1 }, ${k.t.toFixed(3)});
      tl.set('#scam', ${JSON.stringify(camAt(k.fx, k.fy, k.s))}, ${k.t.toFixed(3)});
      tl.to('#scam', { ...${JSON.stringify(camAt(k.fx, k.fy, k.s * 1.05))}, duration: ${(t1 - k.t).toFixed(3)}, ease: 'none' }, ${k.t.toFixed(3)});`;
  }),
  ...labels.map((l, i) => `tl.fromTo('#tl${i}', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18 }, ${l.t0});`),
  `tl.set('#flash', { opacity: 0.9 }, ${T.story}); tl.to('#flash', { opacity: 0, duration: 0.3 }, ${T.story + 0.03});`,
];
const story = `<div class="clip scene etch" data-start="${T.story}" data-duration="${(T.info - T.story).toFixed(3)}">
    <div class="cam" id="scam">
      ${[img1, img2, img3].map((a, i) => `<div class="gimg" id="g${i + 1}">${svgLines(ETCH, a, 3)}</div>`).join('\n      ')}
    </div>
    <div class="etex"></div>
    ${labels.map((l, i) => `<div class="clip tlabel3" data-start="${l.t0}" data-duration="${(l.t1 - l.t0).toFixed(3)}"><span id="tl${i}">${l.text}</span></div>`).join('\n    ')}
  </div>`;

// ─── Инфографика «Спросим у бота» ─────────────────────────────────────────────

const photo = `<g id="iPhoto" opacity="0">
    <rect x="190" y="560" width="700" height="520" rx="30" fill="#0f141c" stroke="#f4f4f2" stroke-width="6"/>
    <rect x="220" y="590" width="640" height="460" rx="14" fill="#1b2533"/>
    <rect x="300" y="620" width="480" height="300" fill="#2b4a6e" stroke="#cfd5de" stroke-width="5"/>
    <path id="mount" d="M300,820 L380,730 L440,780 L520,690 L610,790 L680,740 L780,810 V840 H300 Z" fill="#3a5578" stroke="#cfd5de" stroke-width="3"/>
    <rect id="sea" x="300" y="840" width="480" height="80" fill="#1f6fa3"/>
    <path d="M320,870 q20,-8 40,0 M420,890 q20,-8 40,0 M560,868 q20,-8 40,0 M680,892 q20,-8 40,0" stroke="#cfe6ff" stroke-width="3" fill="none"/>
    <path d="M540,620 V920 M300,770 H780" stroke="#cfd5de" stroke-width="5"/>
    <rect x="240" y="960" width="600" height="70" rx="10" fill="#2a3240"/>
    <path d="M260,1000 h120 M400,990 h180 M600,1004 h90" stroke="#5b6574" stroke-width="10" stroke-linecap="round"/>
    <g id="plate"><rect x="660" y="930" width="170" height="44" rx="6" fill="#fff" stroke="#0f141c" stroke-width="3"/>
      <rect x="660" y="930" width="34" height="44" rx="4" fill="#1a52c4"/><text x="677" y="961" font-size="16" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">GE</text>
      <text x="762" y="962" font-size="24" font-weight="800" fill="#0f141c" text-anchor="middle" font-family="Montserrat">AB-123-C</text></g>
    <text x="540" y="1132" font-size="30" font-weight="700" fill="#9aa0aa" text-anchor="middle" font-family="Montserrat">«Квартира в центре Казани»</text>
  </g>`;
const ring = (id: string, cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse id="${id}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${C6.accent}" stroke-width="7" opacity="0"/>`;
const clue = (i: number, y: number, a: string, b: string) => `<g id="clue${i}" opacity="0">
    <rect x="150" y="${y}" width="780" height="88" rx="20" fill="#1a212c" stroke="#2c3542" stroke-width="2"/>
    <circle cx="200" cy="${y + 44}" r="24" fill="${C6.accent}"/><text x="200" y="${y + 54}" font-size="28" font-weight="800" fill="#07090d" text-anchor="middle" font-family="Montserrat">${i}</text>
    <text x="246" y="${y + 56}" font-size="32" font-weight="700" fill="#fff" font-family="Montserrat">${a} <tspan fill="${C6.accent}">${b}</tspan></text></g>`;
const map = `<g id="iMap" opacity="0">
    <rect x="150" y="560" width="780" height="620" rx="30" fill="#101a24" stroke="#f4f4f2" stroke-width="6"/>
    <path d="M150,980 C300,950 360,1020 520,990 C640,970 720,1060 930,1020 V1180 H150 Z" fill="#163650"/>
    <path d="M300,600 C340,700 300,820 420,900 M600,580 C640,720 760,760 930,800 M150,760 C280,740 420,800 560,760" stroke="#26384a" stroke-width="10" fill="none"/>
    <g id="kazan"><circle cx="740" cy="660" r="12" fill="#cfd5de"/><text x="740" y="720" font-size="30" font-weight="700" fill="#cfd5de" text-anchor="middle" font-family="Montserrat">Казань</text>
      <path id="kazanX" d="M690,650 L790,700 M790,650 L690,700" stroke="#ff4a3a" stroke-width="8" opacity="0"/></g>
    <g id="batumi" opacity="0"><circle cx="340" cy="960" r="12" fill="#fff"/><text x="340" y="1040" font-size="34" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">Батуми</text></g>
    <g id="mpin"><g transform="translate(740 650)"><path d="M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
  </g>
  <g id="stamp" opacity="0"><g transform="translate(560 1360) rotate(-8)">
    <rect x="-300" y="-62" width="600" height="124" rx="16" fill="none" stroke="${C6.accent}" stroke-width="10"/>
    <text x="0" y="24" font-size="66" font-weight="900" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat" letter-spacing="3">ЭТО НЕ КАЗАНЬ</text></g></g>`;
const info = `<div class="clip scene" data-start="${T.info}" data-duration="${(T.cta - T.info).toFixed(3)}" style="background: radial-gradient(70% 55% at 50% 45%, #141c2a, #05070b)">
    <div class="ih" style="top: 360px; font-size: 52px; letter-spacing: 0">Спросим у <span class="acc">бота</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      ${photo}${ring('r1', 540, 780, 270, 190)}${ring('r2', 745, 952, 120, 50)}
      ${clue(1, 1210, 'За окном —', 'море и горы')}${clue(2, 1318, 'Номер машины —', 'GE, Грузия')}
      ${map}
    </svg>
  </div>`;
const I = T.info;
const infoTweens = [
  `tl.fromTo('#iPhoto', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${I + 0.05});`,
  `tl.fromTo('#r1', { opacity: 0, scale: 1.3, svgOrigin: '540 780' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 0.85});`,
  `tl.fromTo('#clue1', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.0});`,
  `tl.to('#r1', { opacity: 0, duration: 0.2 }, ${I + 1.7});`,
  `tl.fromTo('#r2', { opacity: 0, scale: 1.4, svgOrigin: '745 952' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 1.75});`,
  `tl.fromTo('#clue2', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.9});`,
  `tl.to(['#iPhoto', '#r2', '#clue1', '#clue2'], { opacity: 0, duration: 0.25 }, ${I + 2.75});`,
  `tl.fromTo('#iMap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${I + 2.95});`,
  `tl.to('#kazanX', { opacity: 1, duration: 0.15 }, ${I + 3.5});`,
  `tl.to('#mpin', { x: -400, y: 310, duration: 0.6, ease: 'power3.inOut' }, ${I + 3.6});`,
  `tl.fromTo('#batumi', { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${I + 4.1});`,
  `tl.fromTo('#stamp', { opacity: 0, scale: 1.8, svgOrigin: '560 1360' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power4.in' }, ${I + 4.35});`,
];

// ─── Реплики, монтаж, анимация ────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Нашёл квартиру в центре Казани.<br>Почти даром»' },
  { t: 2.17, text: '«Почти даром? Проверь фото»' },
  { t: 3.95, text: '«Как?»' },
  { t: 4.77, text: '«Как Золушку — по туфельке»' },
  { t: T.story, text: '' },
];
const cA = (s = 2.0) => ({ fx: A.head.x + 70, fy: A.head.y + 160, s });
const cB = (s = 2.0) => ({ fx: B.head.x - 60, fy: B.head.y + 160, s });
const shots: Shot[] = [
  { t: 0, fx: 545, fy: 1120, s: 1.3, ds: 1.06 },
  { t: 2.17, ...cB(), fg: 'L' },
  { t: 3.95, ...cA(2.3) },
  { t: 4.77, ...cB(1.9), fg: 'L' },
  { t: 6.2, ...cB(2.5), ds: 1.08 },
];
const acts = [
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.down, 0, 0), pose(B, 'L', POSE.phone, 0, 0), pose(B, 'R', POSE.down, 0, 0),
  screen(A, true, 0.1), screen(B, true, 0.1), tilt(A, 5, 0.3),
  face(B, 'doubt', 2.17), pose(B, 'R', POSE.wave, 2.25), tilt(B, -6, 2.2),
  face(A, 'shock', 3.95), pose(A, 'L', POSE.shrug, 4.0, 0.25), tilt(A, -6, 3.95, 0.25),
  face(B, 'smirk', 4.77), pose(B, 'R', POSE.point, 4.85), tilt(B, 0, 4.8), wave(B, 'R', POSE.point, 5.3, 2, 12), face(B, 'cool', 6.2), nod(B, 6.4, 1),
  blinks(A, [1.3, 5.6]), blinks(B, [1.0, 3.4]),
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.story);

export const v03: Video6 = {
  id: '03-zolushka',
  title: 'GeoBot: как Золушку — по туфельке',
  end: END,
  body: `
      <style>
        .etch { background: ${C.paper}; }
        .etex { position: absolute; inset: 0; pointer-events: none; background: url(grain-dark.png), radial-gradient(80% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(40,32,20,0.42) 100%); mix-blend-mode: multiply; }
        .tlabel3 { position: absolute; left: 0; right: 0; top: 300px; text-align: center; z-index: 4; }
        .tlabel3 span { display: inline-block; padding: 14px 26px 12px; background: #eceae4; color: #1d1c1a; border: 3px solid #2a2927; box-shadow: 0 0 0 5px rgba(236,234,228,0.9);
          font-size: 34px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; line-height: 1.2; white-space: nowrap; }
        .gimg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; opacity: 0; }
        .ctaBox7 { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 240px; text-align: center; font-size: 80px; font-weight: 800; line-height: 1.15; color: #fff; }
      </style>
      ${PATTERNS(C.ink)}
      <div class="clip scene" id="room" data-start="0" data-duration="${T.story}" style="background:#000">
        <div class="cam" id="cam">${svg6(kitchen)}</div>
        <div class="grain"></div>
      </div>
      ${cap.html}
      ${story}
      ${info}
      <div class="clip scene" data-start="${T.cta}" data-duration="${(T.bio - T.cta).toFixed(2)}" style="background:#000">
        <div class="ctaBox7"><div id="c1">Врать умеют люди.</div><div id="c2" class="acc" style="margin-top:20px">Фото — нет.</div></div>
      </div>
      <div class="clip scene" data-start="${T.bio}" data-duration="${(END - T.bio).toFixed(2)}" style="background:#000">
        <div class="ctaBox6"><div id="ctaIcon">${ctaIcon(ctaGlyph)}</div><div id="ctaText">Бот в био</div></div>
      </div>`,
  tweens: [
    shotTweens(shots, T.story),
    ...acts, ...storyTweens, ...infoTweens,
    `tl.fromTo('#c1', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2 }, ${T.cta});`,
    `tl.fromTo('#c2', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2 }, ${T.cta2});`,
    `tl.fromTo('#ctaIcon', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${T.bio});`,
    `tl.fromTo('#ctaText', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, ${T.bio + 0.1});`,
  ].join('\n      '),
};
