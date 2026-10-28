/**
 * 05. «Друг пишет: „Угадай, где я — с меня тысяча“» — в формате роликов 03–04 и образцов Артёма от 22.10.2026:
 * 4 реплики двигающихся человечков → сказка на гравюрах, кадр на каждый бит → «Спросим у бота» со штампом →
 * вывод → «Бот в био». 25,2 с. Музыка — из образца «Даниил и жрецы» (92 BPM): дроп 7,73 с — сказка, кадр каждые
 * 0,65 с, инфографика 15,53 с, вывод 20,73 с, «Бот в био» 23,3 с, конец 25,2 с (дальше в образце заставка TikTok).
 * Сказка: Красная Шапочка (Шарль Перро, 1697; братья Гримм, 1812) узнала волка по ушам, глазам и зубам.
 * Подсказки настоящие: буква «ў» есть только в белорусском алфавите; широкий проспект со сталинками — Минск.
 */
import { C, ETCH, PATTERNS, svgLines } from '../engine3.ts';
import {
  C6, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';
import { fig, rng, sh, wh, type FigOpts } from '../etch.ts';

const END = 25.2;
const T = { story: 7.73, s2: 10.33, s3: 12.93, s3b: 14.23, info: 15.53, cta: 20.73, cta2: 21.45, bio: 23.3 };
const BEAT = 0.65;

// ─── Диалог: лестничная клетка ночью ─────────────────────────────────────────

const FLOOR = 1500;
const A = figure({ id: 'A', x: 330, pose: 'stand', floor: FLOOR, hair: 'spiky', face: 'happy', phone: 'R', phoneRot: -138 });
const B = figure({ id: 'B', x: 770, pose: 'stand', floor: FLOOR, hair: 'long', face: 'neutral', phone: 'L', phoneRot: 138 });

const steps = (() => {
  let d = '';
  for (let i = 0; i < 9; i++) d += `M${560 + i * 70},${FLOOR - i * 60} h70 v-60 `;
  return d;
})();
const stairwell = `
  <g stroke="#cfd3da" stroke-width="4" opacity="0.85">
    <path d="M-400,${FLOOR} H1480"/>
    <path d="M560,${FLOOR} ${steps}"/>
    <path d="M590,${FLOOR - 120} L1220,${FLOOR - 660} M590,${FLOOR - 120} v-110 M760,${FLOOR - 266} v-110 M930,${FLOOR - 412} v-110 M1100,${FLOOR - 558} v-110 M590,${FLOOR - 230} L1220,${FLOOR - 770}"/>
    <rect x="60" y="520" width="300" height="420"/><path d="M210,520 V940 M60,730 H360"/>
    <path d="M100,1500 V1080 h200 V1500 M270,1290 h14"/>
    <path d="M540,260 V420 M500,420 h80 l-14,30 h-52 z"/>
  </g>
  <circle cx="540" cy="440" r="160" fill="url(#lampGlow)" stroke="none"/>
  ${A.svg}${B.svg}`;

// ─── Гравюры: Красная Шапочка ────────────────────────────────────────────────

const P = C.paper;
const room = (y0: number) => `
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="${P}" stroke="none"/>
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="url(#c0)" stroke="none" opacity="0.9"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${-400 + i * 170},-400 V${y0}" stroke-width="2"/>`).join('')}
  ${wh(`M140,420 h300 v360 h-300 Z`, 'stroke-width="5"')}<rect x="150" y="430" width="280" height="340" fill="url(#x45)" stroke="none"/>
  <path d="M290,420 V780 M140,600 H440" stroke-width="5"/><circle cx="360" cy="500" r="30" fill="${P}" stroke-width="3"/>
  <rect x="-400" y="${y0}" width="1880" height="1400" fill="${P}" stroke="none"/><rect x="-400" y="${y0}" width="1880" height="1400" fill="url(#a0)" stroke="none" opacity="0.7"/>
  <path d="M-400,${y0} H1480" stroke-width="5"/>`;

/** Волк в бабушкином чепце (профиль, морда влево): (x, y) — нос. big — крупные уши и зубы. */
const wolf = (x: number, y: number, k: number, mouth = false) => `<g transform="translate(${x} ${y}) scale(${k})">
    ${sh('M60,-60 L110,-200 L150,-70 Z M150,-70 L210,-190 L230,-50 Z', 'b60', 'stroke-width="4"')}
    ${sh('M0,0 C10,-30 40,-50 90,-70 C150,-95 240,-90 280,-40 C310,0 300,70 250,100 C200,130 120,110 80,70 C60,50 30,40 0,30 Z', 'a120', 'stroke-width="5"')}
    <path d="M0,0 C-10,10 -6,26 4,30" stroke-width="4"/><circle cx="2" cy="6" r="10" fill="${C.ink}"/>
    <circle cx="120" cy="-30" r="16" fill="${P}" stroke-width="4"/><circle cx="124" cy="-30" r="7" fill="${C.ink}"/>
    ${mouth ? wh('M4,30 C40,46 80,62 110,64 C80,90 30,80 6,46 Z', 'stroke-width="4"') + '<path d="M14,34 l8,14 l8,-12 l8,16 l8,-14 l10,16 l8,-14 l10,14 l10,-12 M20,62 l8,-12 l10,10 l10,-12 l10,10" stroke-width="3"/>' : '<path d="M6,30 C40,40 70,48 100,50" stroke-width="4"/>'}
    ${sh('M150,-110 C200,-170 300,-150 320,-60 C330,0 320,60 290,110 C320,40 300,-40 250,-80 C220,-100 180,-110 150,-110 Z', 'hd', 'stroke-width="4"')}
    <path d="M290,110 C300,150 320,170 350,180 M300,100 C330,130 360,140 390,140" stroke-width="4"/>
  </g>`;

const bed = (x: number, y: number) => `
  ${sh(`M${x - 40},${y - 360} V${y + 60} M${x - 40},${y - 360} q40,-60 80,0 V${y - 120} Z`, 'b90', 'stroke-width="5"')}
  ${wh(`M${x},${y - 200} C${x + 80},${y - 260} ${x + 260},${y - 240} ${x + 300},${y - 180} L${x + 260},${y - 120} H${x} Z`, 'stroke-width="4"')}
  ${sh(`M${x},${y - 120} C${x + 200},${y - 190} ${x + 500},${y - 180} ${x + 700},${y - 120} V${y} H${x} Z`, 'hw', 'stroke-width="5"')}
  <path d="M${x + 40},${y - 130} C${x + 240},${y - 180} ${x + 480},${y - 170} ${x + 680},${y - 110}" stroke-width="3"/>
  <path d="M${x},${y} H${x + 700} M${x + 20},${y} V${y + 60} M${x + 680},${y} V${y + 60}" stroke-width="5"/>`;

const hood: FigOpts = { x: 0, y: 0, dress: 'dress', pat: 'b30', sleeve: 'c60', hair: 'kerchief', face: 'calm' };
const basket = `<path d="M-30,0 h60 l-8,40 h-44 Z" fill="${P}" stroke-width="3"/><path d="M-26,10 h52 M-22,22 h44 M-24,0 q24,-36 48,0" stroke-width="2.5"/>`;

const img1 = `${room(1350)}${bed(180, 1320)}${wolf(300, 1080, 0.75)}
  ${fig({ ...hood, x: 900, y: 1300, f: -1, arm: [30, 40], arm2: [10, 10], hand: basket })}`;
const img2 = `${room(1350)}${bed(-200, 1500)}${wolf(80, 1150, 1.5)}
  <g transform="translate(330 860)"><circle r="150" fill="none" stroke-width="3" stroke-dasharray="10 10"/></g>
  ${fig({ ...hood, x: 900, y: 1420, s: 1.2, f: -1, arm: [60, 50], arm2: [10, 10], nod: -6 })}`;
const img3 = `${room(1350)}${bed(-300, 1560)}${wolf(80, 1150, 1.7, true)}
  ${fig({ ...hood, x: 930, y: 1460, s: 1.2, f: -1, lean: -14, arm: [140, 30], arm2: [120, 20], face: 'shout' })}
  <path d="M600,700 l30,-40 M640,760 l50,-20 M590,640 l10,-50" stroke-width="5"/>`;

const crops: Record<number, [number, number, number][]> = {
  1: [[560, 1100, 1.0], [480, 1060, 2.0], [900, 1080, 1.8], [560, 1180, 1.3]],
  2: [[560, 1100, 1.0], [330, 900, 2.0], [900, 1100, 1.7], [300, 980, 2.6]],
  3: [[560, 1100, 1.0], [240, 1220, 2.2], [930, 1100, 1.7], [300, 1180, 2.8]],
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
  { t0: T.story, t1: T.s2, text: 'Бабушка в кровати была странной' },
  { t0: T.s2, t1: T.s3, text: '«Почему у тебя такие большие уши?»' },
  { t0: T.s3, t1: T.s3b, text: '«…и такие большие зубы?»' },
  { t0: T.s3b, t1: T.info, text: 'По мелочам узнала волка' },
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
    ${labels.map((l, i) => `<div class="clip tlabel3" data-start="${l.t0}" data-duration="${(l.t1 - l.t0).toFixed(3)}"><span id="tl${i}" ${l.text.length > 26 ? 'style="font-size:30px;letter-spacing:2px"' : ''}>${l.text}</span></div>`).join('\n    ')}
  </div>`;

// ─── Инфографика «Спросим у бота»: улица → Минск ─────────────────────────────

const stalin = (x: number, w: number, h: number) => {
  let win = '';
  for (let r = 0; r < 6; r++) for (let c = 0; c < Math.floor(w / 46); c++) win += `<rect x="${x + 14 + c * 46}" y="${1000 - h + 60 + r * 44}" width="22" height="28" fill="#2a3446"/>`;
  return `<rect x="${x}" y="${1000 - h}" width="${w}" height="${h}" fill="#c9b99a" stroke="#6b604c" stroke-width="2"/><path d="M${x - 8},${1000 - h} h${w + 16} M${x - 4},${1000 - h + 40} h${w + 8}" stroke="#6b604c" stroke-width="5"/>${win}`;
};
const photo = `<g id="iPhoto" opacity="0">
    <rect x="190" y="560" width="700" height="560" rx="30" fill="#0f141c" stroke="#f4f4f2" stroke-width="6"/>
    <rect x="220" y="590" width="640" height="500" rx="14" fill="#8fb3d6"/>
    ${stalin(220, 230, 330)}${stalin(630, 230, 330)}
    <path d="M220,1000 H860 V1090 H220 Z" fill="#4a4f58"/><path d="M450,1000 L380,1090 M630,1000 L700,1090 M540,1010 V1030 M540,1050 V1076" stroke="#e8e8e8" stroke-width="4"/>
    <rect x="455" y="720" width="170" height="250" fill="#b6a688"/><path d="M470,720 l70,-60 l70,60" fill="#b6a688" stroke="#6b604c" stroke-width="2"/>
    <g id="signW"><rect x="250" y="900" width="170" height="50" rx="6" fill="#1d6b3a" stroke="#fff" stroke-width="2"/>
      <text x="335" y="934" font-size="26" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">КРАМА</text></g>
    <g><rect x="660" y="900" width="190" height="50" rx="6" fill="#7a1f2b" stroke="#fff" stroke-width="2"/>
      <text x="755" y="934" font-size="24" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">АЎТАСЭРВІС</text></g>
    <text x="540" y="1166" font-size="30" font-weight="700" fill="#9aa0aa" text-anchor="middle" font-family="Montserrat">«Угадай, где я»</text>
  </g>`;
const ring = (id: string, cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse id="${id}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${C6.accent}" stroke-width="7" opacity="0"/>`;
const clue = (i: number, y: number, a: string, b: string) => `<g id="clue${i}" opacity="0">
    <rect x="130" y="${y}" width="820" height="88" rx="20" fill="#1a212c" stroke="#2c3542" stroke-width="2"/>
    <circle cx="180" cy="${y + 44}" r="24" fill="${C6.accent}"/><text x="180" y="${y + 54}" font-size="28" font-weight="800" fill="#07090d" text-anchor="middle" font-family="Montserrat">${i}</text>
    <text x="226" y="${y + 56}" font-size="31" font-weight="700" fill="#fff" font-family="Montserrat">${a} <tspan fill="${C6.accent}">${b}</tspan></text></g>`;

const map = `<g id="iMap" opacity="0">
    <rect x="150" y="560" width="780" height="620" rx="30" fill="#101a24" stroke="#f4f4f2" stroke-width="6"/>
    <path d="M200,1120 C300,980 380,900 470,860 C600,800 700,700 880,620" stroke="#5a6b7c" stroke-width="22" fill="none"/>
    <path d="M200,1120 C300,980 380,900 470,860 C600,800 700,700 880,620" stroke="#d9dee6" stroke-width="4" fill="none" stroke-dasharray="16 12"/>
    <path d="M150,760 C300,780 420,700 560,720 M620,1180 C640,1000 600,900 700,820" stroke="#26384a" stroke-width="10" fill="none"/>
    <text x="300" y="1040" font-size="26" fill="#8fa3b6" font-family="Montserrat" font-style="italic" transform="rotate(-40 300 1040)">пр. Независимости</text>
    <g id="mpin" opacity="0"><g transform="translate(560 820)"><path d="M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
    <text id="nn" x="560" y="680" font-size="40" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat" opacity="0">Минск, Беларусь</text>
  </g>
  <g id="stamp" opacity="0"><g transform="translate(540 1360) rotate(-8)">
    <rect x="-250" y="-62" width="500" height="124" rx="16" fill="none" stroke="${C6.accent}" stroke-width="10"/>
    <text x="0" y="24" font-size="70" font-weight="900" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat" letter-spacing="4">ЭТО МИНСК</text></g></g>`;
const info = `<div class="clip scene" data-start="${T.info}" data-duration="${(T.cta - T.info).toFixed(3)}" style="background: radial-gradient(70% 55% at 50% 45%, #141c2a, #05070b)">
    <div class="ih" style="top: 360px; font-size: 52px; letter-spacing: 0">Спросим у <span class="acc">бота</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      ${photo}${ring('r1', 755, 925, 125, 50)}${ring('r2', 540, 790, 330, 230)}
      ${clue(1, 1210, 'На вывеске буква', '«ў» — Беларусь')}${clue(2, 1318, 'Проспект и сталинки —', 'Минск')}
      ${map}
    </svg>
  </div>`;
const I = T.info;
const infoTweens = [
  `tl.fromTo('#iPhoto', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${I + 0.05});`,
  `tl.fromTo('#r1', { opacity: 0, scale: 1.4, svgOrigin: '755 925' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 0.8});`,
  `tl.fromTo('#clue1', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 0.95});`,
  `tl.to('#r1', { opacity: 0, duration: 0.2 }, ${I + 1.6});`,
  `tl.fromTo('#r2', { opacity: 0, scale: 1.2, svgOrigin: '540 790' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 1.65});`,
  `tl.fromTo('#clue2', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.8});`,
  `tl.to(['#iPhoto', '#r2', '#clue1', '#clue2'], { opacity: 0, duration: 0.25 }, ${I + 2.55});`,
  `tl.fromTo('#iMap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${I + 2.7});`,
  `tl.fromTo('#mpin', { opacity: 0, y: -90 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, ${I + 3.05});`,
  `tl.fromTo('#nn', { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${I + 3.4});`,
  `tl.fromTo('#stamp', { opacity: 0, scale: 1.8, svgOrigin: '540 1360' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power4.in' }, ${I + 3.9});`,
];

// ─── Реплики, монтаж, анимация ────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Друг пишет: „Угадай, где я —<br>с меня тысяча“»' },
  { t: 2.2, text: '«Тысяча твоя»' },
  { t: 3.6, text: '«Как? Там просто улица»' },
  { t: 5.1, text: '«Как Красная Шапочка —<br>по мелочам»' },
  { t: T.story, text: '' },
];
const cA = (s = 2.0) => ({ fx: A.head.x + 70, fy: A.head.y + 160, s });
const cB = (s = 2.0) => ({ fx: B.head.x - 60, fy: B.head.y + 160, s });
const shots: Shot[] = [
  { t: 0, fx: 550, fy: 1120, s: 1.3, ds: 1.06 },
  { t: 2.2, ...cB(), fg: 'L' },
  { t: 3.6, ...cA(2.2), fg: 'R' },
  { t: 5.1, ...cB(1.9), fg: 'L' },
  { t: 6.4, ...cB(2.5), ds: 1.08 },
];
const acts = [
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.down, 0, 0), pose(B, 'L', POSE.phone, 0, 0), pose(B, 'R', POSE.down, 0, 0),
  screen(A, true, 0.1), screen(B, true, 0.1), tilt(A, 4, 0.3),
  face(B, 'smirk', 2.2), pose(B, 'R', POSE.wave, 2.3), wave(B, 'R', POSE.wave, 2.7, 1),
  face(A, 'doubt', 3.6), pose(A, 'L', POSE.shrug, 3.65, 0.25), tilt(A, -6, 3.6, 0.25),
  face(B, 'grin', 5.1), pose(B, 'R', POSE.point, 5.15), wave(B, 'R', POSE.point, 5.6, 2, 12), face(B, 'cool', 6.4), nod(B, 6.6, 1),
  blinks(A, [1.4, 6.0]), blinks(B, [0.9, 4.1]),
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.story);

export const v05: Video6 = {
  id: '05-shapochka',
  title: 'GeoBot: как Красная Шапочка — по мелочам',
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
        <div class="cam" id="cam">${svg6(stairwell)}</div>
        <div class="grain"></div>
      </div>
      ${cap.html}
      ${story}
      ${info}
      <div class="clip scene" data-start="${T.cta}" data-duration="${(T.bio - T.cta).toFixed(2)}" style="background:#000">
        <div class="ctaBox7"><div id="c1">Город прячется в мелочах.</div><div id="c2" class="acc" style="margin-top:20px">Бот их видит.</div></div>
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
