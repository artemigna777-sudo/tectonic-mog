/**
 * 09. «Сдают квартиру в Сочи у моря. 2000 в сутки!» — формат роликов 07–08 (человечки `rich` → гравюры → «спросим
 * у бота» → «Бот в био»). 25,2 с. Музыка — из образца «Даниил и жрецы» (92 BPM), как в ролике 05: дроп 7,73 с —
 * история, кадр каждые 0,65 с, инфографика 15,53 с, вывод 20,73 с, «Бот в био» 23,3 с; джингл TikTok в образце
 * с 25,25 с — музыку режем до него.
 * История: Архимед проверил золотую корону царя Гиерона водой — подделку выдало, сколько воды она вытеснила
 * (легенда в пересказе Витрувия, I век до н. э.).
 * Подсказки на фото настоящие: аптеки в Турции подписаны «ECZANE» с красной буквой «E»; минареты над крышами.
 */
import { C, ETCH, PATTERNS, svgLines } from '../engine3.ts';
import {
  C6, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';
import { column, fig, rng, sh, wh, type FigOpts } from '../etch.ts';

const END = 25.2;
const T = { story: 7.73, s2: 10.33, s3: 12.93, s3b: 14.23, info: 15.53, cta: 20.73, cta2: 21.45, bio: 23.3 };
const BEAT = 0.65;

// ─── Диалог: уютная комната вечером ──────────────────────────────────────────

const FLOOR = 1500;
const A = figure({ id: 'A', x: 330, pose: 'stand', floor: FLOOR, hair: 'curly', face: 'happy', phone: 'R', phoneRot: -138, rich: true, outfit: '#3a2a4d' });
const B = figure({ id: 'B', x: 770, pose: 'stand', floor: FLOOR, hair: 'cap', face: 'neutral', phone: 'L', phoneRot: 138, rich: true, outfit: '#24384f' });

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

// ─── Гравюры: Архимед и корона ───────────────────────────────────────────────

const P = C.paper;
const palace = (y0: number) => `
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="${P}" stroke="none"/>
  <rect x="-400" y="-400" width="1880" height="${y0 + 400}" fill="url(#c0)" stroke="none" opacity="0.8"/>
  ${column(-60, 380, y0)}${column(250, 380, y0)}${column(830, 380, y0)}${column(1140, 380, y0)}
  ${wh(`M-400,300 H1480 V380 H-400 Z`, 'stroke-width="5"')}<path d="M-400,330 H1480" stroke-width="2.5"/>
  ${sh(`M-400,${y0} H1480 V2400 H-400 Z`, 'a0', 'stroke-width="4"')}
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${540 + (i - 4) * 120},${y0} L${540 + (i - 4) * 420},2400" stroke-width="2.5"/>`).join('')}`;
/** Корона: x, y — середина обода. */
const crown = (x: number, y: number, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">
  ${wh('M-60,0 L-70,-70 L-36,-34 L0,-86 L36,-34 L70,-70 L60,0 Z', 'stroke-width="5"')}
  <rect x="-62" y="-6" width="124" height="22" fill="url(#hd)" stroke-width="4"/>
  <circle cx="0" cy="-92" r="9" fill="${P}" stroke-width="4"/><circle cx="-70" cy="-76" r="7" fill="${P}" stroke-width="3"/><circle cx="70" cy="-76" r="7" fill="${P}" stroke-width="3"/>
  <path d="M-40,-20 l8,-14 M10,-30 l6,-12 M44,-18 l6,-12" stroke-width="2.5"/></g>`;
const throne = (x: number, y: number) => `${sh(`M${x - 90},${y} V${y - 360} q90,-60 180,0 V${y} Z`, 'b90', 'stroke-width="5"')}${wh(`M${x - 110},${y - 150} h220 v30 h-220 Z`, 'stroke-width="4"')}`;
const tub = (x: number, y: number, w: number) => `
  <path d="M${x - w / 2 - 20},${y - 150} q${w / 2 + 20},-34 ${w + 40},0" stroke-width="3" fill="none"/>
  ${sh(`M${x - w / 2},${y - 150} H${x + w / 2} L${x + w / 2 - 30},${y} H${x - w / 2 + 30} Z`, 'b60', 'stroke-width="6"')}
  ${wh(`M${x - w / 2 - 20},${y - 170} H${x + w / 2 + 20} V${y - 150} H${x - w / 2 - 20} Z`, 'stroke-width="5"')}`;
const spill = (x: number, y: number) => `
  <path d="M${x},${y} q30,30 20,90 q-10,50 30,90 M${x + 30},${y + 10} q40,40 30,120" stroke-width="5" fill="none"/>
  ${[[x + 60, y + 220], [x + 110, y + 240], [x + 20, y + 250], [x + 150, y + 210]].map(([cx, cy]) => `<path d="M${cx},${cy - 18} q12,14 0,22 q-12,-8 0,-22Z" fill="${P}" stroke-width="3"/>`).join('')}
  <path d="M${x - 40},${y + 280} q120,-20 260,0" stroke-width="3" fill="none"/>`;
const bowl = (x: number, y: number, over = false) => `
  ${sh(`M${x - 130},${y - 120} H${x + 130} Q${x + 120},${y} ${x},${y} Q${x - 120},${y} ${x - 130},${y - 120} Z`, 'a90', 'stroke-width="5"')}
  <path d="M${x - 124},${y - 108} q62,-14 124,0 t124,0" stroke-width="3" fill="none"/>
  ${over ? `<path d="M${x + 126},${y - 116} q30,20 26,80 M${x + 130},${y - 110} q50,30 52,110 M${x - 126},${y - 116} q-28,20 -22,80" stroke-width="4" fill="none"/>
  <path d="M${x - 200},${y + 10} q200,-30 420,0" stroke-width="3" fill="none"/>` : ''}`;
const king: FigOpts = { x: 0, y: 0, dress: 'robe', pat: 'b120', sleeve: 'b120', hair: 'crown', beard: true };
const arch: FigOpts = { x: 0, y: 0, dress: 'tunic', pat: 'a30', sleeve: 'c60', legs: 'a0', hair: 'bald', beard: true };

const img1 = `${palace(1380)}${throne(330, 1380)}
  ${fig({ ...king, x: 330, y: 1240, f: 1, leg: [90, 90], leg2: [90, 90], arm: [150, 10], arm2: [20, 30], hand: crown(0, -30, 0.7), face: 'calm' })}
  ${fig({ ...arch, x: 820, y: 1450, s: 1.05, f: -1, arm: [40, 60], arm2: [10, 20], nod: 8, face: 'calm' })}`;
const img2 = `<rect x="-400" y="-400" width="1880" height="2800" fill="${P}" stroke="none"/>
  <rect x="-400" y="-400" width="1880" height="1700" fill="url(#c90)" stroke="none" opacity="0.8"/>
  ${column(80, 300, 1300)}${column(1000, 300, 1300)}${sh('M-400,1300 H1480 V2400 H-400Z', 'a0', 'stroke-width="4"')}
  ${fig({ ...arch, x: 540, y: 1300, s: 1.3, f: 1, arm: [150, 30], arm2: [140, 20], face: 'shout' })}
  ${tub(540, 1520, 640)}${spill(860, 1380)}
  <path d="M370,1000 l-30,-40 M420,960 l-10,-50 M680,960 l20,-50 M730,1000 l40,-40" stroke-width="6"/>`;
const img3 = `${palace(1380)}
  ${bowl(330, 1300)}${bowl(760, 1300, true)}
  <rect x="290" y="1210" width="80" height="40" fill="url(#b30)" stroke-width="4"/>
  ${crown(760, 1240, 0.8)}
  ${fig({ ...king, x: 540, y: 1600, s: 1.15, f: 1, arm: [96, 4], arm2: [20, 30], face: 'shout' })}`;

const crops: Record<number, [number, number, number][]> = {
  1: [[560, 1150, 1.0], [330, 950, 2.2], [820, 1180, 2.0], [330, 900, 3.0], [560, 1100, 1.3]],
  2: [[540, 1250, 1.05], [560, 1000, 2.3], [900, 1580, 2.2], [540, 1250, 1.5], [940, 1640, 3.0]],
  3: [[560, 1300, 1.05], [760, 1230, 2.4], [330, 1260, 2.2], [560, 1300, 1.4], [960, 1300, 2.6]],
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
  { t0: T.story, t1: T.s2, text: 'Царю принесли «золотую» корону' },
  { t0: T.s2, t1: T.s3, text: 'Архимед: «Эврика! Проверим водой»' },
  { t0: T.s3, t1: T.s3b, text: 'Корона вытеснила больше воды' },
  { t0: T.s3b, t1: T.info, text: 'Подделку выдала мелочь' },
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
      <rect x="190" y="560" width="700" height="560" fill="#9fd2f2"/>
      <rect x="190" y="800" width="700" height="90" fill="#2a8ac4"/>
      <path d="M190,830 q50,-8 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0" stroke="#cbe9f8" stroke-width="3" fill="none"/>
      <g fill="#f1e6d2" stroke="#b9a988" stroke-width="2"><rect x="200" y="760" width="120" height="130"/><rect x="330" y="730" width="90" height="160"/><rect x="600" y="750" width="140" height="140"/><rect x="750" y="770" width="130" height="120"/></g>
      <path d="M520,890 V650 M506,650 h28 l-14,-46 Z M510,700 h20 M510,760 h20" stroke="#e9e1cf" stroke-width="14" fill="none"/>
      <path d="M506,650 h28 l-14,-50 Z" fill="#c9bfa9"/><circle cx="520" cy="596" r="6" fill="#d9b44a"/>
      <rect x="190" y="890" width="700" height="230" fill="#e9dcc4"/>
      <path d="M190,890 H890" stroke="#8a7a5a" stroke-width="6"/>
      <g stroke="#6b6b6b" stroke-width="6"><path d="M200,960 H880 M220,960 V1120 M300,960 V1120 M380,960 V1120 M460,960 V1120 M540,960 V1120 M620,960 V1120 M700,960 V1120 M780,960 V1120 M860,960 V1120"/></g>
      <g transform="translate(700 610)"><rect x="-16" y="-16" width="180" height="70" rx="8" fill="#fff" stroke="#c42b2b" stroke-width="4"/>
        <rect x="-8" y="-8" width="54" height="54" rx="6" fill="#d62b2b"/><text x="19" y="36" font-size="44" font-weight="900" fill="#fff" text-anchor="middle" font-family="Montserrat">E</text>
        <text x="106" y="31" font-size="30" font-weight="900" fill="#c42b2b" text-anchor="middle" font-family="Montserrat">ECZANE</text></g>
    </g>
    <text x="540" y="1166" font-size="30" font-weight="700" fill="#9aa0aa" text-anchor="middle" font-family="Montserrat">«Сочи, 50 м до моря, 2000 ₽/сутки»</text>
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
      <rect x="150" y="560" width="780" height="620" fill="#4a3a2a"/>
      <path d="M150,560 H930 V760 C820,800 700,760 600,800 C480,850 380,790 260,820 C210,832 170,820 150,830Z" fill="#14324a"/>
      <path d="M150,1180 V1060 C260,1040 360,1090 470,1060 C560,1036 620,1080 700,1050 C800,1020 880,1060 930,1040 V1180Z" fill="#14324a"/>
      <path d="M150,830 C170,820 210,832 260,820 C380,790 480,850 600,800 C700,760 820,800 930,760" stroke="#c9b28c" stroke-width="3" fill="none"/>
    </g>
    <text x="300" y="680" font-size="28" fill="#6f90ab" font-family="Montserrat" font-style="italic">Чёрное море</text>
    <text x="300" y="1140" font-size="28" fill="#6f90ab" font-family="Montserrat" font-style="italic">Средиземное море</text>
    <g><circle cx="830" cy="640" r="12" fill="#cfd5de"/><text x="830" y="700" font-size="30" font-weight="700" fill="#cfd5de" text-anchor="middle" font-family="Montserrat">Сочи</text>
      <path id="xSochi" d="M780,630 L880,690 M880,630 L780,690" stroke="#ff4a3a" stroke-width="8" opacity="0"/></g>
    <g id="mpin" opacity="0"><g transform="translate(470 1050)"><path d="M0,0 C-26,-34 -34,-50 -34,-64 A34,34 0 1 1 34,-64 C34,-50 26,-34 0,0 Z" fill="${C6.accent}" stroke="#07090d" stroke-width="5"/><circle cy="-64" r="13" fill="#07090d"/></g></g>
    <text id="nn" x="470" y="930" font-size="40" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat" opacity="0">Турция</text>
  </g>
  <g id="stamp" opacity="0"><g transform="translate(540 1360) rotate(-8)">
    <rect x="-290" y="-62" width="580" height="124" rx="16" fill="none" stroke="${C6.accent}" stroke-width="10"/>
    <text x="0" y="24" font-size="66" font-weight="900" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat" letter-spacing="3">ЭТО НЕ СОЧИ</text></g></g>`;
const info = `<div class="clip scene" data-start="${T.info}" data-duration="${(T.cta - T.info).toFixed(3)}" style="background: radial-gradient(70% 55% at 50% 45%, #141c2a, #05070b)">
    <div class="ih" style="top: 360px; font-size: 52px; letter-spacing: 0">Спросим у <span class="acc">бота</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      ${photo}${ring('r1', 785, 630, 130, 60)}${ring('r2', 520, 720, 60, 150)}
      ${clue(1, 1210, '«ECZANE» —', 'аптека по-турецки')}${clue(2, 1318, 'За окном —', 'минарет')}
      ${map}
    </svg>
  </div>`;
const I = T.info;
const infoTweens = [
  `tl.fromTo('#iPhoto', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${I + 0.05});`,
  `tl.fromTo('#r1', { opacity: 0, scale: 1.4, svgOrigin: '785 630' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 0.85});`,
  `tl.fromTo('#clue1', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.0});`,
  `tl.to('#r1', { opacity: 0, duration: 0.2 }, ${I + 1.75});`,
  `tl.fromTo('#r2', { opacity: 0, scale: 1.2, svgOrigin: '520 720' }, { opacity: 1, scale: 1, duration: 0.25 }, ${I + 1.8});`,
  `tl.fromTo('#clue2', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.25 }, ${I + 1.95});`,
  `tl.to(['#iPhoto', '#r2', '#clue1', '#clue2'], { opacity: 0, duration: 0.25 }, ${I + 2.9});`,
  `tl.fromTo('#iMap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${I + 3.05});`,
  `tl.to('#xSochi', { opacity: 1, duration: 0.15 }, ${I + 3.3});`,
  `tl.fromTo('#mpin', { opacity: 0, y: -90 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, ${I + 3.5});`,
  `tl.fromTo('#nn', { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${I + 3.9});`,
  `tl.fromTo('#stamp', { opacity: 0, scale: 1.8, svgOrigin: '540 1360' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power4.in' }, ${I + 4.4});`,
];

// ─── Реплики, монтаж, анимация ────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Сдают квартиру в Сочи у моря.<br>2000 в сутки!»' },
  { t: 2.2, text: '«Слишком хорошо. Покажи фото»' },
  { t: 3.6, text: '«Ну фото как фото…»' },
  { t: 5.1, text: '«Проверим, как Архимед —<br>корону»' },
  { t: T.story, text: '' },
];
const cA = (s = 2.0) => ({ fx: A.head.x + 70, fy: A.head.y + 160, s });
const cB = (s = 2.0) => ({ fx: B.head.x - 60, fy: B.head.y + 160, s });
const shots: Shot[] = [
  { t: 0, fx: 550, fy: 1120, s: 1.3, ds: 1.06 },
  { t: 2.2, ...cB(), fg: 'L' },
  { t: 3.6, ...cA(2.3), fg: 'R' },
  { t: 5.1, ...cB(1.9), fg: 'L', ds: 1.1 },
];
const idle = (f: ReturnType<typeof figure>, at: number) =>
  `tl.to('#${f.id}', { y: -5, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 6 }, ${at});`;
const acts = [
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.down, 0, 0), pose(B, 'L', POSE.phone, 0, 0), pose(B, 'R', POSE.down, 0, 0),
  screen(A, true, 0.1), screen(B, true, 0.1), tilt(A, 6, 0.3), idle(A, 0), idle(B, 0.4),
  `tl.to('.bulb', { opacity: 0.55, duration: 0.7, stagger: 0.09, yoyo: true, repeat: 8, ease: 'sine.inOut' }, 0);`,
  face(B, 'doubt', 2.2), pose(B, 'R', POSE.wave, 2.3), tilt(B, -6, 2.25), wave(B, 'R', POSE.wave, 2.7, 1),
  face(A, 'think', 3.6), pose(A, 'L', POSE.shrug, 3.65, 0.25), tilt(A, -6, 3.6, 0.25),
  face(B, 'smirk', 5.1), pose(B, 'R', POSE.point, 5.15), wave(B, 'R', POSE.point, 5.6, 2, 12), face(B, 'cool', 6.5), nod(B, 6.7, 1),
  blinks(A, [1.4, 6.0]), blinks(B, [0.9, 4.1]),
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.story);

export const v09: Video6 = {
  id: '09-arhimed',
  title: 'GeoBot: как Архимед — корону',
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
        <div class="ctaBox7"><div id="c1">Проверить фото —<br>10 секунд.</div><div id="c2" class="acc" style="margin-top:28px">Вернуть деньги —<br>никогда.</div></div>
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
