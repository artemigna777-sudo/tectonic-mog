/**
 * 07. «Где мы тогда отдыхали?» — возвращаем формат роликов 03–05 (человечки → история на гравюрах → «спросим у
 * бота» → «Бот в био») с улучшенной рисовкой: объёмные человечки в одежде с кистями, кроссовками и тенью (`rich`
 * в `engine6.ts`), тёплая комната с гирляндой, гравюра с подписями-уликами. 25,4 с.
 * Музыка — из образца «сделал фейк» (92 BPM): тихая петля, обрыв на 7,5 с и дроп 7,67 с — начало истории, бит
 * 0,64 с, инфографика 15,4 с, вывод 21,4 с, «Бот в био» 23,4 с; джингл TikTok в образце с 25,55 с — музыку режем до него.
 * История: Шерлок Холмс при первой встрече с доктором Ватсоном говорит «Вы были в Афганистане» —
 * по загару, осанке и руке на перевязи (А. Конан Дойл, «Этюд в багровых тонах», 1887).
 * Подсказки на фото настоящие: красные черепичные крыши и крепостная стена на склоне, бухта между гор — Котор.
 */
import { C, ETCH, PATTERNS, svgLines } from '../engine3.ts';
import {
  C6, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';
import { fig, rng, sh, wh, column, bricks, type FigOpts } from '../etch.ts';

const END = 25.4;
const T = { story: 7.67, s2: 10.3, s3: 12.83, s3b: 14.1, info: 15.4, cta: 21.4, cta2: 22.1, bio: 23.4 };
const BEAT = 0.64;

// ─── Диалог: уютная комната вечером ──────────────────────────────────────────

const FLOOR = 1500;
const A = figure({ id: 'A', x: 330, pose: 'stand', floor: FLOOR, hair: 'spiky', face: 'happy', phone: 'R', phoneRot: -138, rich: true, outfit: '#26344d' });
const B = figure({ id: 'B', x: 770, pose: 'stand', floor: FLOOR, hair: 'long', face: 'neutral', phone: 'L', phoneRot: 138, rich: true, outfit: '#1f3d42' });

const bokeh = (() => {
  const r = rng(5);
  return Array.from({ length: 16 }, (_, i) => {
    const x = -60 + i * 76 + r() * 30;
    const y = 300 + Math.sin(i * 0.9) * 40 + r() * 20;
    const c = ['#ffcf8a', '#ff9a5a', '#ffe9b8'][i % 3];
    return `<path d="M${x - 38},${y - 30} Q${x},${y + 24} ${x + 38},${y - 30}" stroke="#3a3f4a" stroke-width="3" fill="none"/><circle class="bulb" cx="${x}" cy="${y + 8}" r="12" fill="${c}" stroke="none"/><circle cx="${x}" cy="${y + 8}" r="30" fill="${c}" opacity="0.16" stroke="none"/>`;
  }).join('');
})();
const room = `
  <rect x="-400" y="-400" width="1880" height="${FLOOR + 400}" fill="url(#wall)" stroke="none"/>
  <rect x="-400" y="${FLOOR}" width="1880" height="900" fill="#0e131c" stroke="none"/>
  <path d="M-400,${FLOOR} H1480" stroke="#3a4558" stroke-width="5"/>
  ${Array.from({ length: 10 }, (_, i) => `<path d="M${-300 + i * 220},${FLOOR} L${-420 + i * 260},2400" stroke="#1a2230" stroke-width="3"/>`).join('')}
  <g>${bokeh}</g>
  <rect x="70" y="520" width="360" height="460" fill="#1a3150" stroke="#cfd3da" stroke-width="5"/>
  <g fill="#ffcf8a" stroke="none" opacity="0.85">${Array.from({ length: 22 }, (_, i) => `<rect x="${86 + (i % 6) * 56}" y="${600 + Math.floor(i / 6) * 90 + ((i * 7) % 3) * 6}" width="${14 + (i % 3) * 6}" height="${20 + (i % 4) * 8}"/>`).join('')}</g>
  <path d="M250,520 V980 M70,750 H430" stroke="#cfd3da" stroke-width="5"/>
  <rect x="560" y="430" width="300" height="220" fill="#101722" stroke="#cfd3da" stroke-width="4"/>
  <path d="M580,610 l60,-70 l40,40 l60,-90 l80,120" stroke="#ff8a2a" stroke-width="4" fill="none"/><circle cx="700" cy="480" r="16" fill="#ffe29a" stroke="none"/>
  <path d="M540,720 H900 M560,720 V1060 M880,720 V1060 M560,880 H880 M560,1040 H880" stroke="#4a5568" stroke-width="5" fill="none"/>
  <g stroke="none"><rect x="580" y="740" width="30" height="130" fill="#c44b4b"/><rect x="614" y="750" width="24" height="120" fill="#e0b341"/><rect x="642" y="736" width="34" height="134" fill="#3f7fbf"/><rect x="684" y="756" width="26" height="114" fill="#5aa86a"/><rect x="716" y="744" width="30" height="126" fill="#8a5fc0"/><rect x="760" y="900" width="90" height="140" fill="#cf7a3a"/><rect x="590" y="900" width="140" height="140" fill="#2d3a52"/></g>
  <circle cx="985" cy="780" r="260" fill="url(#lampGlow)" stroke="none"/>
  <path d="M985,${FLOOR} V900 M945,${FLOOR} h80" stroke="#5a6578" stroke-width="6"/><path d="M925,900 L950,820 H1020 L1045,900Z" fill="#e8b66a" stroke="#cfd3da" stroke-width="4"/>
  <g stroke="none"><ellipse cx="540" cy="${FLOOR + 100}" rx="520" ry="70" fill="#1f2d44"/><ellipse cx="540" cy="${FLOOR + 100}" rx="440" ry="52" fill="#26385a"/></g>
  <g stroke="none"><rect x="1010" y="1340" width="70" height="160" rx="10" fill="#9a5a3a"/><path d="M1045,1340 q-60,-90 -90,-140 M1045,1340 q-8,-120 -4,-200 M1045,1340 q60,-90 90,-150" stroke="#3f9a5a" stroke-width="14" fill="none" stroke-linecap="round"/></g>
  ${A.svg}${B.svg}`;

// ─── Гравюры: Шерлок Холмс и доктор Ватсон ───────────────────────────────────

const P = C.paper;
const floorBoards = (y0: number) => {
  let d = '';
  for (let i = -8; i <= 8; i++) d += `M${540 + i * 70},${y0} L${540 + i * 280},2400 `;
  for (let y = y0, k = 28; y < 2400; y += k, k *= 1.3) d += `M-400,${y.toFixed(0)} H1480 `;
  return `<rect x="-400" y="${y0}" width="1880" height="${2400 - y0}" fill="${P}" stroke="none"/><rect x="-400" y="${y0}" width="1880" height="${2400 - y0}" fill="url(#b0)" stroke="none" opacity="0.5"/><path d="${d}" stroke-width="2.5"/>`;
};
const parlor = (y0: number) => `
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="${P}" stroke="none"/>
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="url(#c90)" stroke="none" opacity="0.9"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M${-400 + i * 150},-400 V${y0}" stroke-width="2"/>`).join('')}
  ${bricks(60, 560, 330, y0 - 560, 60, 30, 'c30')}
  ${wh(`M30,540 h390 v34 h-390 Z`, 'stroke-width="5"')}${sh(`M130,${y0} V900 H320 V${y0} Z`, 'b0', 'stroke-width="5"')}
  <path d="M180,${y0} q10,-60 0,-90 q20,30 20,90 M230,${y0} q-4,-40 6,-70 q14,34 8,70" stroke-width="3" fill="${P}"/>
  ${wh('M700,300 h260 v440 h-260 Z', 'stroke-width="6"')}<rect x="712" y="312" width="236" height="416" fill="url(#hd)" stroke="none"/>
  <path d="M830,300 V740 M700,520 H960" stroke-width="5"/>
  ${sh('M660,290 q20,260 -10,470 h60 q-30,-200 -10,-470 Z M1000,290 q-20,260 10,470 h-60 q30,-200 10,-470 Z', 'a60', 'stroke-width="4"')}
  ${wh('M470,420 h150 v190 h-150 Z', 'stroke-width="5"')}<path d="M480,470 q30,-30 60,0 t60,0 M480,530 q30,-30 60,0 t60,0" stroke-width="2.5"/>
  ${floorBoards(y0)}`;

const flask = (x: number, y: number, k = 1, liquid = 'b60') => `<g transform="translate(${x} ${y}) scale(${k})">
  ${wh('M-14,-60 h28 v36 l30,60 q8,24 -16,24 h-56 q-24,0 -16,-24 l30,-60 Z', 'stroke-width="4"')}
  <path d="M-34,16 h68 l12,28 q4,14 -14,14 h-64 q-18,0 -14,-14 Z" fill="url(#${liquid})" stroke="none"/>
  <path d="M-14,-60 h28" stroke-width="7"/></g>`;
const table = (x: number, y: number, w: number) => `
  ${wh(`M${x},${y} h${w} v22 h-${w} Z`, 'stroke-width="5"')}${sh(`M${x + 20},${y + 22} V${y + 230} h40 V${y + 22} Z M${x + w - 60},${y + 22} V${y + 230} h40 V${y + 22} Z`, 'b60', 'stroke-width="4"')}
  ${flask(x + 80, y, 0.9, 'b30')}${flask(x + 190, y, 0.7, 'a60')}
  <path d="M${x + 260},${y} h70 M${x + 270},${y} v-24 h50 v24 M${x + 296},${y - 24} v-30" stroke-width="5" fill="none"/>`;

const holmes: FigOpts = { x: 0, y: 0, dress: 'coat', pat: 'b60', sleeve: 'b60', legs: 'a0', hair: 'hat' };
const watson: FigOpts = { x: 0, y: 0, dress: 'coat', pat: 'a30', sleeve: 'a30', legs: 'a0', hair: 'short' };
/** Рука Ватсона на перевязи. */
const sling = (x: number, y: number, s = 1, f = 1) => `<g transform="translate(${x} ${y}) scale(${s * f} ${s})">${sh('M-18,-130 L40,-100 L50,-40 L8,-30 Z', 'hd', 'stroke-width="4"')}<path d="M-18,-134 L30,-144" stroke-width="6"/></g>`;

const img1 = `${parlor(1380)}${table(80, 1280, 380)}
  ${fig({ ...holmes, x: 720, y: 1520, f: -1, arm: [30, 40], arm2: [-10, 30], leg: [4, 0], leg2: [-4, 0], face: 'calm' })}
  ${fig({ ...watson, x: 1020, y: 1500, s: 0.96, f: -1, arm: [10, 20], arm2: [25, 100], leg: [12, 10], leg2: [-10, 0], face: 'calm' })}
  ${sling(1020, 1500, 0.96, -1)}`;

const callout = (x: number, y: number, w: number, text: string, tx: number, ty: number) =>
  `<path d="M${x + w / 2},${ty < y ? y : y + 56} L${tx},${ty}" stroke-width="3.5" stroke-dasharray="10 8"/><circle cx="${tx}" cy="${ty}" r="10" fill="${C.ink}"/>
   <rect x="${x}" y="${y}" width="${w}" height="56" fill="#eceae4" stroke="${C.ink}" stroke-width="3"/>
   <text x="${x + w / 2}" y="${y + 38}" font-family="Montserrat" font-weight="800" font-size="26" letter-spacing="2" text-anchor="middle" fill="${C.ink}" stroke="none">${text}</text>`;
const img2 = `${parlor(1380)}
  ${fig({ ...watson, x: 620, y: 1520, s: 1.5, f: 1, arm: [8, 10], arm2: [30, 100], leg: [6, 4], leg2: [-6, 0], face: 'calm' })}
  ${sling(620, 1520, 1.5, 1)}
  ${callout(250, 1010, 220, 'ЗАГАР', 592, 1262)}${callout(610, 1070, 340, 'ОСАНКА ВОЕННОГО', 612, 1345)}${callout(640, 1500, 340, 'РУКА НА ПЕРЕВЯЗИ', 690, 1415)}`;
const img3 = `${parlor(1380)}${table(-60, 1280, 380)}
  ${fig({ ...holmes, x: 470, y: 1520, s: 1.25, f: 1, arm: [96, 4], arm2: [20, 30], leg: [4, 0], leg2: [-4, 0], face: 'calm' })}
  ${fig({ ...watson, x: 900, y: 1520, s: 1.25, f: -1, arm: [150, 20], arm2: [140, 30], leg: [4, 0], leg2: [-4, 0], face: 'shout' })}
  <path d="M780,820 l-24,-60 M830,800 v-70 M890,810 l30,-60 M940,850 l56,-40" stroke-width="6"/>`;

const crops: Record<number, [number, number, number][]> = {
  1: [[560, 1180, 1.0], [300, 1200, 1.9], [880, 1200, 1.9], [720, 1160, 2.5], [560, 1150, 1.3], [1020, 1180, 2.3]],
  2: [[600, 1250, 1.05], [600, 1270, 1.55], [600, 1180, 1.45], [620, 1430, 1.7], [600, 1260, 1.3], [600, 1260, 1.8]],
  3: [[600, 1150, 1.05], [480, 1100, 2.2], [900, 1100, 2.2], [690, 1180, 1.6], [900, 950, 3.0], [600, 1120, 1.25]],
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
  { t0: T.story, t1: T.s2, text: 'Холмс впервые видит Ватсона' },
  { t0: T.s2, t1: T.s3, text: 'Загар, осанка, рука на перевязи' },
  { t0: T.s3, t1: T.s3b, text: '«Вы были в Афганистане»' },
  { t0: T.s3b, t1: T.info, text: 'Ватсон потерял дар речи' },
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

// ─── Инфографика «Спросим у бота»: фото из отпуска → Котор ───────────────────

const roofs = (() => {
  const r = rng(11);
  let d = '';
  for (let i = 0; i < 26; i++) {
    const x = 250 + (i % 9) * 40 + r() * 10;
    const y = 930 + Math.floor(i / 9) * 22 + r() * 6;
    d += `<path d="M${x},${y} l17,-13 l17,13 Z" fill="#c8532e" stroke="#7a2c14" stroke-width="1.5"/><rect x="${x + 2}" y="${y}" width="30" height="14" fill="#efe3c9" stroke="#8c7a56" stroke-width="1"/>`;
  }
  return d;
})();
const photo = `<g id="iPhoto" opacity="0">
    <clipPath id="vk"><rect x="190" y="560" width="700" height="560" rx="22"/></clipPath>
    <rect x="186" y="556" width="708" height="568" rx="26" fill="#0f141c" stroke="#f4f4f2" stroke-width="6"/>
    <g clip-path="url(#vk)">
      <rect x="190" y="560" width="700" height="560" fill="#f2a56a"/>
      <rect x="190" y="560" width="700" height="260" fill="#6fa6d6" opacity="0.8"/>
      <path d="M190,800 L300,690 L380,760 L470,640 L560,740 L650,660 L760,760 L890,700 V900 H190Z" fill="#5d6f8c"/>
      <path d="M190,880 L330,790 L470,860 L600,780 L740,850 L890,800 V960 H190Z" fill="#41526c"/>
      <path d="M200,1120 L190,980 C320,930 560,950 890,900 V1120 Z" fill="#2a7aa8"/>
      <path d="M250,900 L330,800 L420,870 L520,790 L600,860" stroke="#e9dcc0" stroke-width="7" fill="none"/>
      <path d="M520,790 v-26 h14 v26 M600,860 v-24 h14 v24" fill="#e9dcc0" stroke="#7a6a4e" stroke-width="2"/>
      ${roofs}
      <path d="M560,1000 q40,-10 80,0 l-14,18 h-52 Z M720,1050 q36,-10 72,0 l-12,16 h-48 Z" fill="#fff" stroke="#8aa" stroke-width="2"/>
      <path d="M190,1060 q60,-20 120,0 t120,0 t120,0 t120,0 t120,0" stroke="#cfe8f6" stroke-width="3" fill="none" opacity="0.8"/>
    </g>
    <text x="540" y="1166" font-size="30" font-weight="700" fill="#9aa0aa" text-anchor="middle" font-family="Montserrat">«Лето 2019. Где это было?»</text>
  </g>`;
const ring = (id: string, cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse id="${id}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${C6.accent}" stroke-width="7" opacity="0"/>`;
const clue = (i: number, y: number, a: string, b: string) => `<g id="clue${i}" opacity="0">
    <rect x="110" y="${y}" width="860" height="88" rx="20" fill="#1a212c" stroke="#2c3542" stroke-width="2"/>
    <circle cx="160" cy="${y + 44}" r="24" fill="${C6.accent}"/><text x="160" y="${y + 54}" font-size="28" font-weight="800" fill="#07090d" text-anchor="middle" font-family="Montserrat">${i}</text>
    <text x="206" y="${y + 56}" font-size="31" font-weight="700" fill="#fff" font-family="Montserrat">${a} <tspan fill="${C6.accent}">${b}</tspan></text></g>`;
const map = `<g id="iMap" opacity="0">
    <rect x="150" y="560" width="780" height="620" rx="30" fill="#101a24" stroke="#f4f4f2" stroke-width="6"/>
    <clipPath id="mk"><rect x="153" y="563" width="774" height="614" rx="27"/></clipPath>
    <g clip-path="url(#mk)">
      <rect x="150" y="560" width="780" height="620" fill="#14324a"/>
      <path d="M520,560 C500,660 560,740 520,820 C480,900 560,980 600,1180 H930 V560Z" fill="#1d3a2c"/>
      <path d="M520,560 C500,660 560,740 520,820 C480,900 560,980 600,1180" stroke="#9fc4a8" stroke-width="4" fill="none"/>
      <path d="M560,740 q40,20 60,80 q-30,30 -70,20Z" fill="#14324a"/>
    </g>
    <text x="270" y="700" font-size="30" fill="#6f90ab" font-family="Montserrat" font-style="italic">Адриатическое море</text>
    <g id="mpin" opacity="0"><g transform="translate(590 830)"><path d="M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
    <text id="nn" x="700" y="1010" font-size="40" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat" opacity="0">Котор, Черногория</text>
  </g>
  <g id="stamp" opacity="0"><g transform="translate(540 1360) rotate(-8)">
    <rect x="-260" y="-62" width="520" height="124" rx="16" fill="none" stroke="${C6.accent}" stroke-width="10"/>
    <text x="0" y="24" font-size="70" font-weight="900" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat" letter-spacing="4">ЭТО КОТОР</text></g></g>`;
const info = `<div class="clip scene" data-start="${T.info}" data-duration="${(T.cta - T.info).toFixed(3)}" style="background: radial-gradient(70% 55% at 50% 45%, #141c2a, #05070b)">
    <div class="ih" style="top: 360px; font-size: 52px; letter-spacing: 0">Спросим у <span class="acc">бота</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      ${photo}${ring('r1', 430, 880, 170, 90)}${ring('r2', 540, 780, 340, 200)}
      ${clue(1, 1210, 'Красные крыши и стена', 'на склоне')}${clue(2, 1318, 'Бухта между гор —', 'как фьорд')}
      ${map}
    </svg>
  </div>`;
const I = T.info;
const infoTweens = [
  `tl.fromTo('#iPhoto', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${I + 0.05});`,
  `tl.fromTo('#r1', { opacity: 0, scale: 1.4, svgOrigin: '430 880' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 0.85});`,
  `tl.fromTo('#clue1', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.0});`,
  `tl.to('#r1', { opacity: 0, duration: 0.2 }, ${I + 1.75});`,
  `tl.fromTo('#r2', { opacity: 0, scale: 1.2, svgOrigin: '540 780' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 1.8});`,
  `tl.fromTo('#clue2', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.95});`,
  `tl.to(['#iPhoto', '#r2', '#clue1', '#clue2'], { opacity: 0, duration: 0.25 }, ${I + 2.9});`,
  `tl.fromTo('#iMap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${I + 3.05});`,
  `tl.fromTo('#mpin', { opacity: 0, y: -90 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, ${I + 3.5});`,
  `tl.fromTo('#nn', { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${I + 3.9});`,
  `tl.fromTo('#stamp', { opacity: 0, scale: 1.8, svgOrigin: '540 1360' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power4.in' }, ${I + 4.4});`,
];

// ─── Реплики, монтаж, анимация ────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Помнишь это фото?<br>Где мы тогда отдыхали?»' },
  { t: 2.57, text: '«Без понятия.<br>Это же 2019-й»' },
  { t: 4.5, text: '«И как узнать?»' },
  { t: 5.77, text: '«Как Шерлок Холмс —<br>по мелочам»' },
  { t: T.story, text: '' },
];
const cA = (s = 2.0) => ({ fx: A.head.x + 70, fy: A.head.y + 160, s });
const cB = (s = 2.0) => ({ fx: B.head.x - 60, fy: B.head.y + 160, s });
const shots: Shot[] = [
  { t: 0, fx: 550, fy: 1120, s: 1.3, ds: 1.06 },
  { t: 2.57, ...cB(), fg: 'L' },
  { t: 4.5, ...cA(2.3), fg: 'R' },
  { t: 5.77, ...cB(1.9), fg: 'L', ds: 1.1 },
];
const idle = (f: ReturnType<typeof figure>, at: number) =>
  `tl.to('#${f.id}', { y: -5, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 6 }, ${at});`;
const acts = [
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.down, 0, 0), pose(B, 'L', POSE.phone, 0, 0), pose(B, 'R', POSE.down, 0, 0),
  screen(A, true, 0.1), screen(B, true, 0.1), tilt(A, 6, 0.3), idle(A, 0), idle(B, 0.4),
  `tl.to('.bulb', { opacity: 0.55, duration: 0.7, stagger: 0.09, yoyo: true, repeat: 8, ease: 'sine.inOut' }, 0);`,
  face(B, 'think', 2.57), pose(B, 'R', POSE.wave, 2.65), tilt(B, -6, 2.6), wave(B, 'R', POSE.wave, 3.05, 1),
  face(A, 'sad', 4.5), pose(A, 'L', POSE.shrug, 4.55, 0.25), tilt(A, -6, 4.5, 0.25),
  face(B, 'smirk', 5.77), pose(B, 'R', POSE.point, 5.85), wave(B, 'R', POSE.point, 6.3, 2, 12), face(B, 'cool', 6.8), nod(B, 7.0, 1),
  blinks(A, [1.4, 5.5]), blinks(B, [0.9, 3.9]),
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.story);

export const v07: Video6 = {
  id: '07-holms',
  title: 'GeoBot: как Шерлок Холмс — по мелочам',
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
        <div class="cam" id="cam">${svg6(room)}</div>
        <div class="grain"></div>
      </div>
      ${cap.html}
      ${story}
      ${info}
      <div class="clip scene" data-start="${T.cta}" data-duration="${(T.bio - T.cta).toFixed(2)}" style="background:#000">
        <div class="ctaBox7"><div id="c1">Фото помнит</div><div id="c2" class="acc" style="margin-top:20px">больше, чем ты.</div></div>
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
    `tl.to('#ctaIcon', { scale: 1.06, duration: 0.5, yoyo: true, repeat: 2, ease: 'sine.inOut' }, ${T.bio + 0.4});`,
  ].join('\n      '),
};
