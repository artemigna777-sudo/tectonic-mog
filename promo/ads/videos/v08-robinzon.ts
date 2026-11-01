/**
 * 08. «Турагент прислал фото отеля: „Турция, 5 звёзд“» — формат ролика 07 (человечки `rich` → гравюры → «спросим
 * у бота» → «Бот в био»). 25 с. Музыка — из образца «принцесса на горошине» (136 BPM), как в ролике 03: тихое вступление
 * под диалог, дроп 7,77 с — история, бит 0,433 с, инфографика 15,57 с, вывод 21,33 с, «Бот в био» 22,9 с; джингл
 * TikTok в образце с 25,05 с — музыку режем до него.
 * История: Робинзон Крузо (Д. Дефо, 1719) увидел на песке единственный след босой ноги и понял, что на острове не один.
 * Подсказки на фото настоящие: на дорожных знаках и вывесках Греции надписи греческим алфавитом (ΣΤΟΠ — «стоп»,
 * ΞΕΝΟΔΟΧΕΙΟ — «гостиница»), в Турции — латиницей (DUR, OTEL).
 */
import { C, ETCH, PATTERNS, svgLines } from '../engine3.ts';
import {
  C6, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';
import { cloud, feather, fig, ground, rng, sea, sh, sky, sun, wh, type FigOpts } from '../etch.ts';

const END = 25.0;
const T = { story: 7.77, s2: 10.37, s3: 12.97, s3b: 14.27, info: 15.57, cta: 21.33, cta2: 22.0, bio: 22.9 };
const BEAT = 0.4333;

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

// ─── Гравюры: Робинзон Крузо и след на песке ─────────────────────────────────

const P = C.paper;
const HZ = 1180;
const palm = (x: number, y: number, h: number, lean: number) => {
  const tx = x + lean;
  const ty = y - h;
  const fronds = [60, 100, 140, 220, 260, 300].map((a, i) => feather(tx, ty, a, 120 + (i % 3) * 24, i % 2 ? 'b30' : 'a30')).join('');
  return `<path d="M${x},${y} Q${x + lean * 0.2},${y - h * 0.6} ${tx},${ty}" stroke-width="12"/><path d="M${x + 14},${y} Q${x + lean * 0.2 + 12},${y - h * 0.6} ${tx + 6},${ty + 20}" stroke-width="2.5"/>${fronds}`;
};
const beach = `${sky()}${sun(840, 420, 80)}${cloud(240, 420, 320)}${cloud(900, 700, 250)}
  ${sea(HZ)}
  <path d="M300,${HZ - 4} V${HZ - 120} M300,${HZ - 96} l50,-14 l-6,40" stroke-width="5"/>
  ${ground(1330, -400, 1480, 4)}
  <path d="M-400,1340 C-100,1316 300,1350 700,1320 C1000,1300 1300,1330 1480,1316" stroke-width="3.5"/>
  ${palm(110, 1500, 460, 40)}${palm(980, 1470, 380, -50)}`;
const robinson: FigOpts = { x: 0, y: 0, dress: 'tunic', pat: 'a60', sleeve: 'a60', legs: 'a0', hair: 'hat', beard: true };
const print_ = (x: number, y: number, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">
  <path d="M-34,-74 C-54,-36 -50,22 -28,64 C-16,86 18,86 28,60 C46,22 44,-30 26,-68 C14,-90 -20,-92 -34,-74Z" fill="url(#b0)" stroke-width="5"/>
  <path d="M-26,-66 C-42,-34 -38,18 -20,56" stroke-width="2.5" opacity="0.6"/>
  ${[[-36, -104, 13], [-14, -118, 11], [8, -118, 10], [28, -108, 9], [42, -88, 8]].map(([cx, cy, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.15}" fill="url(#b0)" stroke-width="4"/>`).join('')}
  </g>`;
const ripples = (y0: number) => Array.from({ length: 10 }, (_, i) => `<path d="M${-300 + i * 190},${y0 + (i % 3) * 40} q50,-14 100,0 t100,0" stroke-width="2.5" fill="none"/>`).join('');

const img1 = `${beach}${ripples(1420)}
  ${fig({ ...robinson, x: 640, y: 1500, s: 0.85, f: 1, leg: [26, 10], leg2: [-22, 0], arm: [20, 20], arm2: [-14, 10], face: 'calm' })}`;
const img2 = `${beach}${ripples(1420)}
  ${print_(620, 1560, 1.7)}
  ${fig({ ...robinson, x: 920, y: 1500, s: 1.0, f: -1, lean: 24, nod: 14, leg: [20, 20], leg2: [-4, 0], arm: [40, 30], arm2: [-10, 10], face: 'calm' })}`;
const img3 = `${beach}${ripples(1420)}${print_(300, 1590, 1.0)}
  ${fig({ ...robinson, x: 700, y: 1500, s: 1.35, f: 1, leg: [6, 0], leg2: [-6, 0], arm: [160, 20], arm2: [20, 30], nod: -12, face: 'shout' })}
  <path d="M900,1130 q20,-40 50,-30 q30,10 10,40 q-14,16 -14,30 M946,1180 v6" stroke-width="7"/>
  <path d="M820,1240 q16,-30 40,-24 q24,8 8,32 q-12,12 -10,24 M862,1286 v5" stroke-width="5"/>`;

const crops: Record<number, [number, number, number][]> = {
  1: [[560, 1250, 1.0], [640, 1370, 2.4], [140, 1000, 1.6], [900, 1150, 1.5], [620, 1300, 1.3], [640, 1340, 3.0]],
  2: [[600, 1300, 1.05], [620, 1500, 2.2], [920, 1400, 2.4], [620, 1490, 3.2], [760, 1400, 1.5], [620, 1500, 1.6]],
  3: [[500, 1350, 1.05], [700, 1260, 2.2], [300, 1520, 2.6], [740, 1180, 2.8], [600, 1350, 1.5], [700, 1320, 1.7]],
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
  { t0: T.story, t1: T.s2, text: 'Робинзон гулял по пустому острову' },
  { t0: T.s2, t1: T.s3, text: 'И вдруг — один след на песке' },
  { t0: T.s3, t1: T.s3b, text: '«Здесь кто-то был!»' },
  { t0: T.s3b, t1: T.info, text: 'Один след рассказал всё' },
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

const photo = `<g id="iPhoto" opacity="0">
    <clipPath id="vk"><rect x="190" y="560" width="700" height="560" rx="22"/></clipPath>
    <rect x="186" y="556" width="708" height="568" rx="26" fill="#0f141c" stroke="#f4f4f2" stroke-width="6"/>
    <g clip-path="url(#vk)">
      <rect x="190" y="560" width="700" height="560" fill="#7ec3ee"/>
      <rect x="190" y="560" width="700" height="130" fill="#a9dcf6"/>
      <circle cx="800" cy="640" r="42" fill="#fff4b8"/>
      <rect x="230" y="700" width="420" height="250" fill="#f6f1e6" stroke="#b8ad94" stroke-width="3"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${252 + (i % 4) * 100}" y="${770 + Math.floor(i / 4) * 62}" width="64" height="40" fill="#5b9ad0" stroke="#fff" stroke-width="3"/><rect x="${246 + (i % 4) * 100}" y="${812 + Math.floor(i / 4) * 62}" width="76" height="8" fill="#2d6fb0"/>`).join('')}
      <rect x="230" y="700" width="420" height="52" fill="#1d6bb8"/>
      <text x="440" y="738" font-size="30" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="3" font-family="Montserrat, 'DejaVu Sans', sans-serif">ΞΕΝΟΔΟΧΕΙΟ</text>
      <rect x="190" y="950" width="700" height="170" fill="#e2d2b0"/>
      <path d="M220,990 C300,960 560,960 640,990 C660,1060 600,1100 430,1100 C260,1100 200,1060 220,990Z" fill="#37c3d9" stroke="#fff" stroke-width="6"/>
      <path d="M270,1020 q40,-12 80,0 t80,0 t80,0" stroke="#bff0f7" stroke-width="4" fill="none"/>
      <g stroke="#7a5a3a" stroke-width="10" fill="none"><path d="M760,960 Q770,880 800,820"/></g><g stroke="#2f8a4a" stroke-width="9" fill="none" stroke-linecap="round"><path d="M800,820 q-50,-20 -90,10 M800,820 q10,-50 -10,-80 M800,820 q50,-26 90,0 M800,820 q-30,30 -70,40"/></g>
      <path d="M850,1000 V870" stroke="#8a8f99" stroke-width="8"/>
      <path d="M826,812 h48 l20,20 v36 l-20,20 h-48 l-20,-20 v-36Z" transform="translate(-4 -4) scale(0.95)" fill="#d62b2b" stroke="#fff" stroke-width="4"/>
      <text x="842" y="866" font-size="26" font-weight="900" fill="#fff" text-anchor="middle" font-family="Montserrat, 'DejaVu Sans', sans-serif">ΣΤΟΠ</text>
    </g>
    <text x="540" y="1166" font-size="30" font-weight="700" fill="#9aa0aa" text-anchor="middle" font-family="Montserrat">«Турция, 5 звёзд, всё включено»</text>
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
      <path d="M150,560 H480 C500,640 440,700 470,780 C500,860 420,900 440,960 L390,1180 H150Z" fill="#2a4a36"/>
      <path d="M480,560 H930 V1180 H560 C540,1100 600,1040 560,980 C520,920 560,860 520,820 C480,780 540,700 480,560Z" fill="#4a3a2a"/>
      <path d="M480,560 C500,640 440,700 470,780 C500,860 420,900 440,960" stroke="#9fc4a8" stroke-width="3" fill="none"/>
    </g>
    <text x="240" y="760" font-size="38" font-weight="800" fill="#cfe8d6" font-family="Montserrat">Греция</text>
    <text x="640" y="760" font-size="38" font-weight="800" fill="#e8d3b4" font-family="Montserrat">Турция</text>
    <path d="M300,610 l8,-14 M330,600 l8,-12" stroke="none"/>
    <g id="mpin" opacity="0"><g transform="translate(330 980)"><path d="M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
    <text id="nn" x="330" y="1040" font-size="38" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat" opacity="0">Это Греция</text>
  </g>
  <g id="stamp" opacity="0"><g transform="translate(540 1360) rotate(-8)">
    <rect x="-300" y="-62" width="600" height="124" rx="16" fill="none" stroke="${C6.accent}" stroke-width="10"/>
    <text x="0" y="24" font-size="66" font-weight="900" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat" letter-spacing="3">НЕ ТУРЦИЯ</text></g></g>`;
const info = `<div class="clip scene" data-start="${T.info}" data-duration="${(T.cta - T.info).toFixed(3)}" style="background: radial-gradient(70% 55% at 50% 45%, #141c2a, #05070b)">
    <div class="ih" style="top: 360px; font-size: 52px; letter-spacing: 0">Спросим у <span class="acc">бота</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      ${photo}${ring('r1', 440, 720, 200, 40)}${ring('r2', 842, 860, 70, 70)}
      ${clue(1, 1210, 'Вывеска «ΞΕΝΟΔΟΧΕΙΟ» —', 'греческий')}${clue(2, 1318, 'Знак «ΣΤΟΠ» —', 'так пишут в Греции')}
      ${map}
    </svg>
  </div>`;
const I = T.info;
const infoTweens = [
  `tl.fromTo('#iPhoto', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${I + 0.05});`,
  `tl.fromTo('#r1', { opacity: 0, scale: 1.4, svgOrigin: '440 720' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 0.85});`,
  `tl.fromTo('#clue1', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.0});`,
  `tl.to('#r1', { opacity: 0, duration: 0.2 }, ${I + 1.75});`,
  `tl.fromTo('#r2', { opacity: 0, scale: 1.2, svgOrigin: '842 860' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 1.8});`,
  `tl.fromTo('#clue2', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.95});`,
  `tl.to(['#iPhoto', '#r2', '#clue1', '#clue2'], { opacity: 0, duration: 0.25 }, ${I + 2.9});`,
  `tl.fromTo('#iMap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${I + 3.05});`,
  `tl.fromTo('#mpin', { opacity: 0, y: -90 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, ${I + 3.5});`,
  `tl.fromTo('#nn', { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${I + 3.9});`,
  `tl.fromTo('#stamp', { opacity: 0, scale: 1.8, svgOrigin: '540 1360' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power4.in' }, ${I + 4.4});`,
];

// ─── Реплики, монтаж, анимация ────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Турагент прислал фото отеля:<br>„Турция, 5 звёзд“»' },
  { t: 2.17, text: '«Что-то подозрительно…»' },
  { t: 3.95, text: '«Как проверить?»' },
  { t: 4.77, text: '«Как Робинзон —<br>по одному следу»' },
  { t: T.story, text: '' },
];
const cA = (s = 2.0) => ({ fx: A.head.x + 70, fy: A.head.y + 160, s });
const cB = (s = 2.0) => ({ fx: B.head.x - 60, fy: B.head.y + 160, s });
const shots: Shot[] = [
  { t: 0, fx: 550, fy: 1120, s: 1.3, ds: 1.06 },
  { t: 2.17, ...cB(), fg: 'L' },
  { t: 3.95, ...cA(2.3), fg: 'R' },
  { t: 4.77, ...cB(1.9), fg: 'L', ds: 1.1 },
];
const idle = (f: ReturnType<typeof figure>, at: number) =>
  `tl.to('#${f.id}', { y: -5, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 6 }, ${at});`;
const acts = [
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.down, 0, 0), pose(B, 'L', POSE.phone, 0, 0), pose(B, 'R', POSE.down, 0, 0),
  screen(A, true, 0.1), screen(B, true, 0.1), tilt(A, 6, 0.3), idle(A, 0), idle(B, 0.4),
  `tl.to('.bulb', { opacity: 0.55, duration: 0.7, stagger: 0.09, yoyo: true, repeat: 8, ease: 'sine.inOut' }, 0);`,
  face(B, 'doubt', 2.17), pose(B, 'R', POSE.wave, 2.25), tilt(B, -6, 2.2), wave(B, 'R', POSE.wave, 2.6, 1),
  face(A, 'shock', 3.95), pose(A, 'L', POSE.shrug, 4.0, 0.25), tilt(A, -6, 3.95, 0.25),
  face(B, 'smirk', 4.77), pose(B, 'R', POSE.point, 4.85), wave(B, 'R', POSE.point, 5.3, 2, 12), face(B, 'cool', 6.4), nod(B, 6.6, 1),
  blinks(A, [1.4, 5.6]), blinks(B, [0.9, 3.4]),
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.story);

export const v08: Video6 = {
  id: '08-robinzon',
  title: 'GeoBot: как Робинзон — по одному следу',
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
        <div class="ctaBox7"><div id="c1">Фото не врёт.</div><div id="c2" class="acc" style="margin-top:20px">Реклама — бывает.</div></div>
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
