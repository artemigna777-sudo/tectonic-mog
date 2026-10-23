/**
 * 04. «Бабушка не помнит, где познакомилась с дедом» — в формате ролика 03 и образцов Артёма от 22.10.2026:
 * 4 реплики двигающихся человечков → сказка на гравюрах, кадр на каждый бит → «Спросим у бота» со штампом →
 * вывод → «Бот в био». 26 с. Музыка — из образца «Белоснежка» (~128 BPM): дроп 7,23 с — сказка, бит 0,467 с,
 * инфографика 15,37 с, вывод 21,67 с, «Бот в био» 24,4 с, конец 26,15 с (дальше в образце заставка TikTok).
 * Сказка: Мальчик-с-пальчик (Шарль Перро, 1697) бросал белые камешки и по ним привёл братьев домой.
 * Подсказки на фото настоящие: кремль из красного кирпича и слияние Оки и Волги — Нижний Новгород.
 */
import { C, ETCH, PATTERNS, svgLines } from '../engine3.ts';
import {
  C6, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';
import { fig, ground, rng, sh, wh, type FigOpts } from '../etch.ts';

const END = 26.15;
const T = { story: 7.23, s2: 9.97, s3: 12.67, s3b: 14.0, info: 15.37, cta: 21.67, cta2: 22.4, bio: 24.4 };
const BEAT = 0.4667;

// ─── Диалог: ночной двор с качелями ──────────────────────────────────────────

const FLOOR = 1500;
const A = figure({ id: 'A', x: 330, pose: 'stand', floor: FLOOR, hair: 'long', face: 'sad', phone: 'R', phoneRot: -138 });
const B = figure({ id: 'B', x: 770, pose: 'stand', floor: FLOOR, hair: 'cap', face: 'neutral', phone: 'L', phoneRot: 138 });

const windows = (() => {
  let d = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) d += `<rect x="${-40 + c * 130}" y="${320 + r * 150}" width="70" height="90"/>`;
  return d;
})();
const yard = `
  <g stroke="#cfd3da" stroke-width="4" opacity="0.85">
    <path d="M-400,${FLOOR} H1480"/>
    <path d="M-80,250 H620 V1060 M-80,1060 H620"/>${windows}
    <rect x="-40" y="770" width="70" height="90" fill="#d9b56a" stroke="none" opacity="0.55"/>
    <path d="M880,${FLOOR} V820 Q880,780 920,780 H990 M960,782 l40,0 l-8,24 h-24 z"/>
    <path d="M560,${FLOOR} L640,1140 L720,${FLOOR} M1000,${FLOOR} L1080,1140 L1160,${FLOOR} M640,1140 H1080 M760,1140 V1350 M840,1140 V1350 M740,1350 H860"/>
    <path d="M1060,300 a40,40 0 1 0 0.1,0" stroke-width="3"/>
  </g>
  <circle cx="985" cy="806" r="120" fill="url(#lampGlow)" stroke="none"/>
  ${A.svg}${B.svg}`;

// ─── Гравюры: Мальчик-с-пальчик ──────────────────────────────────────────────

const P = C.paper;
/** Дерево «под гравюру»: заштрихованный ствол и крона из клубов. */
const tree = (x: number, y: number, k: number, seed: number) => {
  const r = rng(seed);
  const crown = Array.from({ length: 6 }, () => {
    const cx = x + (r() - 0.5) * 220 * k;
    const cy = y - 380 * k - r() * 200 * k;
    const rr = (90 + r() * 70) * k;
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rr.toFixed(0)}" fill="${P}" stroke-width="3"/><circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rr.toFixed(0)}" fill="url(#${r() > 0.5 ? 'b30' : 'a60'})" stroke="none"/>`;
  }).join('');
  return `${sh(`M${x - 28 * k},${y} C${x - 18 * k},${y - 200 * k} ${x - 24 * k},${y - 320 * k} ${x - 10 * k},${y - 420 * k} L${x + 14 * k},${y - 420 * k} C${x + 24 * k},${y - 320 * k} ${x + 20 * k},${y - 200 * k} ${x + 34 * k},${y} Z`, 'b90', 'stroke-width="3"')}${crown}`;
};
const forest = (y: number, seed: number) =>
  [-300, -120, 60, 240, 420, 600, 780, 960, 1140, 1320].map((x, i) => tree(x + (i % 2) * 40, y - (i % 3) * 30, 1.0 - (i % 3) * 0.12, seed + i)).join('');
const night = `<rect x="-400" y="-400" width="1880" height="2800" fill="${P}" stroke="none"/><rect x="-400" y="-400" width="1880" height="2800" fill="url(#x45)" stroke="none"/>
  <circle cx="800" cy="300" r="70" fill="${P}" stroke-width="3"/>`;
/** Белые камешки вдоль тропинки (светятся в лунном свете). */
const pebbles = (pts: [number, number][], k = 1) =>
  pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${16 * k}" ry="${10 * k}" fill="#fbfaf6" stroke-width="2.5"/><path d="M${x - 30 * k},${y - 18 * k} l-10,-8 M${x + 30 * k},${y - 18 * k} l10,-8 M${x},${y - 24 * k} v-12" stroke-width="2"/>`).join('');
const path = (y0: number) => `<path d="M-400,${y0 + 260} C100,${y0 + 160} 500,${y0 + 120} 1480,${y0 + 40}" stroke-width="3"/>
  <path d="M-400,${y0 + 420} C200,${y0 + 300} 700,${y0 + 240} 1480,${y0 + 150}" stroke-width="3"/>`;

const kid = (o: Partial<FigOpts>) => fig({ x: 0, y: 0, s: 0.62, dress: 'tunic', pat: 'a60', sleeve: 'a60', legs: 'a0', hair: 'short', ...o });
const PATHPTS: [number, number][] = [[-120, 1640], [80, 1600], [280, 1570], [480, 1545], [680, 1520], [880, 1500], [1080, 1485]];

const img1 = `${night}${forest(1250, 1)}${ground(1250, -400, 1480, 4)}${path(1250)}
  ${kid({ x: 380, y: 1400, f: 1, arm: [30, 20], face: 'sad' })}${kid({ x: 500, y: 1390, f: 1, s: 0.56, hair: 'curly', arm: [-10, 10], face: 'sad' })}
  ${fig({ x: 700, y: 1380, s: 0.85, f: 1, dress: 'coat', pat: 'b60', sleeve: 'b60', legs: 'a0', hair: 'hat', beard: true, leg: [24, 10], leg2: [-20, 0], arm: [40, 20] })}`;

const img2 = `${night}${forest(1250, 11)}${ground(1250, -400, 1480, 5)}${path(1250)}
  ${pebbles(PATHPTS.slice(0, 4), 1.4)}
  ${kid({ x: 560, y: 1420, s: 0.9, f: 1, arm: [70, 30], arm2: [10, 10], leg: [24, 10], leg2: [-20, 4], face: 'calm', hand: '<ellipse cx="8" cy="0" rx="12" ry="8" fill="#fbfaf6" stroke-width="2"/>' })}
  <ellipse cx="660" cy="1520" rx="16" ry="10" fill="#fbfaf6" stroke-width="2.5"/>`;

const house = (x: number, y: number) => `${sh(`M${x - 170},${y} V${y - 220} H${x + 170} V${y} Z`, 'c0', 'stroke-width="4"')}
  ${sh(`M${x - 200},${y - 220} L${x},${y - 380} L${x + 200},${y - 220} Z`, 'b120', 'stroke-width="4"')}
  ${wh(`M${x - 110},${y - 170} h80 v80 h-80 Z`, 'stroke-width="3"')}<rect x="${x - 108}" y="${y - 168}" width="76" height="76" fill="#f6e2a8" stroke="none" opacity="0.9"/>
  ${wh(`M${x + 40},${y} V${y - 130} h70 V${y} Z`, 'stroke-width="3"')}
  ${sh(`M${x + 90},${y - 300} V${y - 360} h40 V${y - 270} Z`, 'b0', 'stroke-width="3"')}<path d="M${x + 110},${y - 370} q-20,-30 0,-60 q20,-30 0,-60" stroke-width="3"/>`;
const img3 = `${night}${forest(1180, 21)}${ground(1250, -400, 1480, 6)}${path(1250)}
  ${house(980, 1290)}
  ${pebbles(PATHPTS, 1.2)}
  ${kid({ x: 420, y: 1480, s: 0.8, f: 1, arm: [90, 20], leg: [30, 20], leg2: [-26, 6], face: 'calm' })}
  ${kid({ x: 260, y: 1500, s: 0.72, f: 1, hair: 'curly', arm: [60, 30], leg: [26, 14], leg2: [-24, 4], face: 'calm' })}
  ${kid({ x: 110, y: 1520, s: 0.66, f: 1, arm: [40, 30], leg: [24, 10], leg2: [-20, 4], face: 'calm' })}`;

const crops: Record<number, [number, number, number][]> = {
  1: [[540, 1050, 1.0], [440, 1300, 2.2], [700, 1180, 1.9], [800, 420, 2.0], [540, 1250, 1.3], [380, 1290, 2.6]],
  2: [[560, 1250, 1.1], [560, 1290, 2.4], [300, 1590, 2.2], [660, 1510, 2.8], [460, 1450, 1.5], [560, 1300, 1.9]],
  3: [[600, 1200, 1.05], [980, 1100, 1.9], [500, 1560, 2.0], [300, 1380, 2.0], [980, 1150, 1.4], [640, 1250, 1.15]],
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
  { t0: T.story, t1: T.s2, text: 'Детей завели в тёмный лес' },
  { t0: T.s2, t1: T.s3, text: 'Но мальчик бросал белые камешки' },
  { t0: T.s3, t1: T.s3b, text: 'По ним они вернулись домой' },
  { t0: T.s3b, t1: T.info, text: 'Мелочи привели домой' },
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

// ─── Инфографика «Спросим у бота»: старое фото → Нижний Новгород ─────────────

const merlons = (() => {
  let d = '';
  for (let x = 300; x < 600; x += 40) d += `M${x},700 v-24 l10,10 l10,-10 v24 `;
  return d;
})();
const photo = `<g id="iPhoto" opacity="0">
    <g transform="rotate(-3 540 840)">
      <rect x="210" y="540" width="660" height="600" fill="#efe6d2" stroke="#cbbf9f" stroke-width="3"/>
      <rect x="250" y="580" width="580" height="460" fill="#8a7a62"/>
      <rect x="250" y="580" width="580" height="190" fill="#b6a688"/>
      <path d="M250,800 C380,740 470,720 560,700 L600,700 L620,760 C680,820 760,860 830,880 V1040 H250 Z" fill="#6f604b"/>
      <path d="M300,700 H600 V760 H300 Z" fill="#7b4a3a" stroke="#3b2a20" stroke-width="2"/><path d="${merlons}" fill="#7b4a3a" stroke="#3b2a20" stroke-width="2"/>
      <path d="M380,700 V650 h40 v50 M520,700 V640 h44 v60" fill="#7b4a3a" stroke="#3b2a20" stroke-width="2"/>
      <path d="M380,650 l20,-26 l20,26 M520,640 l22,-30 l22,30" fill="#5a3a2c" stroke="#3b2a20" stroke-width="2"/>
      <path d="M250,980 C420,930 520,940 640,900 C720,880 780,840 830,820 M640,900 C700,960 760,990 830,1000" stroke="#d7d0be" stroke-width="16" fill="none"/>
      <g fill="#3b3226"><circle cx="330" cy="905" r="9"/><path d="M322,915 h16 l4,44 h-24 Z"/><circle cx="356" cy="908" r="9"/><path d="M346,918 h20 l6,42 h-32 Z"/></g>
      <text x="540" y="1100" font-size="28" fill="#6b604c" text-anchor="middle" font-family="Montserrat" font-style="italic">1979</text>
    </g>
  </g>`;
const ring = (id: string, cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse id="${id}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${C6.accent}" stroke-width="7" opacity="0"/>`;
const clue = (i: number, y: number, a: string, b: string) => `<g id="clue${i}" opacity="0">
    <rect x="130" y="${y}" width="820" height="88" rx="20" fill="#1a212c" stroke="#2c3542" stroke-width="2"/>
    <circle cx="180" cy="${y + 44}" r="24" fill="${C6.accent}"/><text x="180" y="${y + 54}" font-size="28" font-weight="800" fill="#07090d" text-anchor="middle" font-family="Montserrat">${i}</text>
    <text x="226" y="${y + 56}" font-size="31" font-weight="700" fill="#fff" font-family="Montserrat">${a} <tspan fill="${C6.accent}">${b}</tspan></text></g>`;
const map = `<g id="iMap" opacity="0">
    <rect x="150" y="560" width="780" height="620" rx="30" fill="#101a24" stroke="#f4f4f2" stroke-width="6"/>
    <path d="M150,700 C330,760 460,860 560,900 C640,930 760,1020 930,1060" stroke="#1d5a86" stroke-width="40" fill="none" stroke-linecap="round"/>
    <path d="M330,1180 C380,1060 470,960 560,900" stroke="#1d5a86" stroke-width="30" fill="none" stroke-linecap="round"/>
    <text x="260" y="720" font-size="26" fill="#6f8aa3" font-family="Montserrat" font-style="italic">Волга</text>
    <text x="340" y="1120" font-size="26" fill="#6f8aa3" font-family="Montserrat" font-style="italic">Ока</text>
    <path d="M590,860 h70 v-16 l10,-12 l10,12 v16 h60 v40 h-150 z" fill="#7b4a3a" stroke="#cfd5de" stroke-width="2"/>
    <g id="mpin" opacity="0"><g transform="translate(590 900)"><path d="M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
    <text id="nn" x="560" y="790" font-size="40" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat" opacity="0">Нижний Новгород</text>
  </g>
  <g id="stamp" opacity="0"><g transform="translate(540 1360) rotate(-8)">
    <rect x="-250" y="-62" width="500" height="124" rx="16" fill="none" stroke="${C6.accent}" stroke-width="10"/>
    <text x="0" y="24" font-size="70" font-weight="900" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat" letter-spacing="4">ЭТО ЗДЕСЬ</text></g></g>`;
const info = `<div class="clip scene" data-start="${T.info}" data-duration="${(T.cta - T.info).toFixed(3)}" style="background: radial-gradient(70% 55% at 50% 45%, #141c2a, #05070b)">
    <div class="ih" style="top: 360px; font-size: 52px; letter-spacing: 0">Спросим у <span class="acc">бота</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      ${photo}${ring('r1', 450, 690, 190, 80)}${ring('r2', 650, 930, 150, 90)}
      ${clue(1, 1210, 'Стена кремля —', 'красный кирпич')}${clue(2, 1318, 'Две реки', 'сливаются в одну')}
      ${map}
    </svg>
  </div>`;
const I = T.info;
const infoTweens = [
  `tl.fromTo('#iPhoto', { opacity: 0, y: 30, rotation: 4, svgOrigin: '540 840' }, { opacity: 1, y: 0, rotation: 0, duration: 0.35 }, ${I + 0.05});`,
  `tl.fromTo('#r1', { opacity: 0, scale: 1.3, svgOrigin: '450 690' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 0.95});`,
  `tl.fromTo('#clue1', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.1});`,
  `tl.to('#r1', { opacity: 0, duration: 0.2 }, ${I + 1.85});`,
  `tl.fromTo('#r2', { opacity: 0, scale: 1.3, svgOrigin: '650 930' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 1.9});`,
  `tl.fromTo('#clue2', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 2.05});`,
  `tl.to(['#iPhoto', '#r2', '#clue1', '#clue2'], { opacity: 0, duration: 0.25 }, ${I + 2.95});`,
  `tl.fromTo('#iMap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${I + 3.15});`,
  `tl.fromTo('#mpin', { opacity: 0, y: -90 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, ${I + 3.6});`,
  `tl.fromTo('#nn', { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${I + 4.0});`,
  `tl.fromTo('#stamp', { opacity: 0, scale: 1.8, svgOrigin: '540 1360' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power4.in' }, ${I + 4.6});`,
];

// ─── Реплики, монтаж, анимация ────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Бабушка не помнит,<br>где познакомилась с дедом»' },
  { t: 2.1, text: '«Это место можно найти»' },
  { t: 3.5, text: '«Как? Осталось одно фото»' },
  { t: 4.9, text: '«Как Мальчик-с-пальчик —<br>по камешкам»' },
  { t: T.story, text: '' },
];
const cA = (s = 2.0) => ({ fx: A.head.x + 70, fy: A.head.y + 160, s });
const cB = (s = 2.0) => ({ fx: B.head.x - 60, fy: B.head.y + 160, s });
const shots: Shot[] = [
  { t: 0, fx: 550, fy: 1120, s: 1.3, ds: 1.06 },
  { t: 2.1, ...cB(), fg: 'L' },
  { t: 3.5, ...cA(2.2), fg: 'R' },
  { t: 4.9, ...cB(1.9), fg: 'L' },
  { t: 6.1, ...cB(2.5), ds: 1.08 },
];
const acts = [
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.down, 0, 0), pose(B, 'L', POSE.phone, 0, 0), pose(B, 'R', POSE.down, 0, 0),
  screen(A, true, 0.1), screen(B, true, 0.1), tilt(A, 8, 0.3, 0.6),
  face(B, 'calm', 2.1), pose(B, 'R', POSE.wave, 2.2), wave(B, 'R', POSE.wave, 2.6, 1),
  face(A, 'doubt', 3.5), pose(A, 'L', POSE.shrug, 3.55, 0.25), tilt(A, -5, 3.5, 0.25),
  face(B, 'smirk', 4.9), pose(B, 'R', POSE.point, 4.95), wave(B, 'R', POSE.point, 5.4, 2, 12), face(B, 'cool', 6.1), nod(B, 6.3, 1),
  blinks(A, [1.4, 5.8]), blinks(B, [0.9, 3.9]),
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.story);

export const v04: Video6 = {
  id: '04-kameshki',
  title: 'GeoBot: как Мальчик-с-пальчик — по камешкам',
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
        <div class="cam" id="cam">${svg6(yard)}</div>
        <div class="grain"></div>
      </div>
      ${cap.html}
      ${story}
      ${info}
      <div class="clip scene" data-start="${T.cta}" data-duration="${(T.bio - T.cta).toFixed(2)}" style="background:#000">
        <div class="ctaBox7"><div id="c1">Память стирается.</div><div id="c2" class="acc" style="margin-top:20px">Фото — помнит.</div></div>
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
