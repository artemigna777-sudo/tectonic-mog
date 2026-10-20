/**
 * 01. «Спорим, не угадаешь, где это?» — реклама GeoBot в формате роликов «Курьера ПДД» по образцу «Обломов»
 * (`engine4.ts`): 20 секунд, 4 реплики светящихся человечков, история на гравюрах, вывод из двух строк.
 * История: в 1976 году каноэ «Хокулеа» прошло от Гавайев до Таити около 4000 км без карт, компаса и приборов.
 * Штурман Мау Пиаилуг вёл его по звёздам, волнам и птицам (Wikipedia: «Hōkūleʻa», «Mau Piailug»).
 * Вывод: «Место выдают мелочи» — бот замечает их за минуту.
 */
import { floorLine, moon as moonLine, person, stars as starLine } from '../draw.ts';
import { C, DLG } from '../engine3.ts';
import type { Video4 } from '../engine4.ts';
import { cloud, feather, fig, rng, rock, sea, sh, sky, sun, wh, type FigOpts } from '../etch.ts';

// ─── Диалог ───────────────────────────────────────────────────────────────────

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'stand', f: 1, arms: ['front', 'down'], hair: 'spiky', face: 'grin' });
const B = person(DLG, { id: 'B', x: 800, floor: 1300, pose: 'stand', f: -1, arms: ['chin', 'down'], hair: 'long', face: 'think' });

/** Телефон в руке у A: на экране фото — деревня, столб, вывеска (оранжевым). */
const PH = { x: 432, y: 1000 };
const phone = `<g transform="translate(${PH.x} ${PH.y}) rotate(-8)">
    <rect x="-50" y="-88" width="100" height="176" rx="16" fill="${C.night}"/>
    <g stroke="${C.accent}" stroke-width="3.5">
      <rect x="-38" y="-70" width="76" height="132" rx="4"/>
      <path d="M-38,22 H38"/>
      <path d="M-30,22 V-6 L-16,-20 L-2,-6 V22 M-22,22 v-12 h10 v12"/>
      <path d="M18,22 V-52 M8,-44 h20 M10,-36 l8,-8 l8,8"/>
      <rect x="2" y="-4" width="30" height="16"/>
      <path d="M-34,-54 q8,-6 14,0 q6,-6 12,0"/>
    </g>
  </g>`;

const scene = `
  ${floorLine(1300)}
  ${moonLine(860, 560, 46, C.night)}
  ${starLine([[200, 520], [330, 620], [640, 470], [980, 700], [120, 760]])}
  ${A.svg}${phone}${B.svg}`;

// ─── Гравюры: океан, каноэ, звёзды, остров ───────────────────────────────────

const P = C.paper;
const HZ = 1150; // горизонт

/** Двойное каноэ с парусами-клешнями, нос вправо: x — середина, y — ватерлиния. */
const canoe = (x: number, y: number, k = 1) => {
  const hull = 'M-430,-70 C-400,-40 -360,-30 -320,-30 H330 C370,-30 410,-40 450,-76 L430,-10 C380,22 300,30 0,30 C-300,30 -380,22 -420,-10 Z';
  const sail = (m: number, h: number) =>
    `${sh(`M${m},-90 C${m - 70},${-90 - h * 0.35} ${m - 150},${-90 - h * 0.75} ${m - 190},${-90 - h} C${m - 90},${-90 - h * 0.82} ${m + 30},${-90 - h * 0.82} ${m + 140},${-90 - h * 0.96} C${m + 90},${-90 - h * 0.6} ${m + 40},${-90 - h * 0.3} ${m},-90 Z`, 'c90', 'stroke-width="3"')}
     <path d="M${m},-90 C${m - 70},${-90 - h * 0.35} ${m - 150},${-90 - h * 0.75} ${m - 190},${-90 - h} M${m},-90 C${m + 40},${-90 - h * 0.3} ${m + 90},${-90 - h * 0.6} ${m + 140},${-90 - h * 0.96}" stroke-width="8"/>
     <path d="M${m - 40},${-90 - h * 0.25} L${m + 30},${-90 - h * 0.25} M${m - 90},${-90 - h * 0.5} L${m + 64},${-90 - h * 0.52} M${m - 140},${-90 - h * 0.75} L${m + 100},${-90 - h * 0.76}" stroke-width="2"/>`;
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <g transform="translate(40 -46) scale(0.94)">${sh(hull, 'a0', 'stroke-width="4"')}</g>
    ${wh('M-330,-86 H340 V-66 H-330 Z', 'stroke-width="4"')}
    <path d="M-280,-66 V-30 M-160,-66 V-30 M-40,-66 V-30 M80,-66 V-30 M200,-66 V-30 M300,-66 V-30" stroke-width="7"/>
    ${sail(-120, 470)}${sail(170, 400)}
    ${sh(hull, 'b0', 'stroke-width="5"')}
    <path d="M-380,-12 C-200,6 200,6 400,-14" stroke="${P}" stroke-width="3"/>
  </g>`;
};

/** Крупная зыбь на переднем плане: гребни и тень под ними. */
const swell = (y0: number, rows: number, seed: number) => {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < rows; i++) {
    const y = y0 + i * 130 + i * i * 12;
    const a = 40 + i * 14;
    const ph = r() * 300;
    let d = `M-420,${y}`;
    for (let x = -420 - ph; x < 1500; x += 360) d += ` C${x + 90},${y - a} ${x + 270},${y - a} ${x + 360},${y}`;
    out += `<path d="${d} L1500,${y + 70} L-420,${y + 70} Z" fill="url(#a0)" stroke="none" opacity="0.7"/><path d="${d}" stroke-width="${4 + i}"/>`;
  }
  return out;
};

/** Птица: размах w, центр x, y. */
const bird = (x: number, y: number, w: number) => `<path d="M${x - w},${y} q${w * 0.5},${-w * 0.55} ${w},0 q${w * 0.5},${-w * 0.55} ${w},0" stroke-width="${Math.max(3, w / 12)}"/>`;

/** Пальма: ствол из точки (x, y) с наклоном и пучок листьев-перьев. */
const palm = (x: number, y: number, h: number, lean: number) => {
  const tx = x + lean;
  const ty = y - h;
  const fronds = [70, 110, 145, 215, 250, 290].map((a, i) => feather(tx, ty, a, 70 + (i % 3) * 14, i % 2 ? 'b30' : 'a30')).join('');
  return `<path d="M${x},${y} Q${x + lean * 0.2},${y - h * 0.6} ${tx},${ty}" stroke-width="9"/>${fronds}`;
};

/** Ночное небо: густая штриховка, звёзды — бумажные крестики, Южный Крест крупнее и соединён линиями. */
const night = (() => {
  const r = rng(76);
  let d = '';
  for (let i = 0; i < 70; i++) {
    const x = -380 + r() * 1840;
    const y = -380 + r() * (HZ + 300);
    const k = 3 + r() * 6;
    d += `M${(x - k).toFixed(0)},${y.toFixed(0)} h${(2 * k).toFixed(0)} M${x.toFixed(0)},${(y - k).toFixed(0)} v${(2 * k).toFixed(0)} `;
  }
  const cross: [number, number][] = [[780, 260], [800, 560], [680, 400], [900, 420], [850, 490]];
  const big = cross.map(([x, y], i) => {
    const k = i === 1 ? 34 : 24;
    return wh(`M${x},${y - k} L${x + k * 0.22},${y - k * 0.22} L${x + k},${y} L${x + k * 0.22},${y + k * 0.22} L${x},${y + k} L${x - k * 0.22},${y + k * 0.22} L${x - k},${y} L${x - k * 0.22},${y - k * 0.22} Z`, 'stroke="none"');
  }).join('');
  return `<rect x="-400" y="-400" width="1880" height="${HZ + 400}" fill="${P}" stroke="none"/>
    <rect x="-400" y="-400" width="1880" height="${HZ + 400}" fill="url(#b0)" stroke="none"/>
    <rect x="-400" y="-400" width="1880" height="${HZ + 400}" fill="url(#x45)" stroke="none" opacity="0.5"/>
    <path d="${d}" stroke="${P}" stroke-width="3.5"/>
    <path d="M780,260 L800,560 M680,400 L900,420" stroke="${P}" stroke-width="2" stroke-dasharray="6 10"/>${big}`;
})();

/** Штурман: голый торс, повязка, длинные волосы. */
const nav: FigOpts = { x: 0, y: 0, dress: 'none', pat: 'a30', hair: 'long', face: 'calm' };

/** 1. День: океан до горизонта, каноэ, штурман на корме смотрит вперёд. */
const day = `
  ${sky()}${sun(250, 470, 70)}${cloud(820, 380, 300)}${cloud(-120, 660, 260)}${cloud(1240, 760, 220)}
  ${sea(HZ)}
  ${canoe(560, 1360, 1)}
  ${fig({ ...nav, x: 250, y: 1076, arm: [-4, 6], arm2: [10, 8] })}
  ${swell(1430, 4, 11)}`;

/** 2. Ночь: каноэ меньше, штурман на корме тянет руку к Южному Кресту. */
const stars = `
  ${night}
  ${sea(HZ)}
  <rect x="-400" y="${HZ}" width="1880" height="1300" fill="url(#c0)" stroke="none" opacity="0.8"/>
  ${canoe(640, 1420, 0.8)}
  ${fig({ ...nav, x: 410, y: 1180, s: 0.8, arm: [158, 6], arm2: [14, 10], nod: -30 })}
  ${swell(1520, 3, 5)}`;

/** 3. Остров на горизонте, над ним птицы, каноэ идёт к нему. */
const ISL = 'M520,1152 C560,1100 620,1060 690,1030 C760,1000 820,980 870,1000 C930,1022 980,1080 1040,1152 Z';
const island = `
  ${sky()}${sun(300, 820, 60)}${cloud(120, 470, 260)}${cloud(1150, 380, 240)}
  ${rock('isl', ISL, [500, 960, 560, 200], 60, 9, 0.4)}
  ${palm(700, 1034, 120, -26)}${palm(760, 1012, 150, 20)}${palm(830, 1000, 110, -10)}
  ${sea(HZ)}
  ${bird(640, 640, 70)}${bird(830, 540, 90)}${bird(560, 470, 52)}${bird(960, 700, 60)}${bird(740, 380, 44)}
  ${canoe(500, 1520, 0.62)}
  ${fig({ ...nav, x: 355, y: 1380, s: 0.62, arm: [120, 0], arm2: [10, 8], nod: -6 })}
  ${swell(1600, 3, 21)}`;

export const v01: Video4 = {
  id: '01-polinezija',
  title: 'GeoBot: штурман без компаса',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 550, fy: 1110, s: 1.45 },
  lines: [
    { text: '«Спорим, не угадаешь,<br>где это?»', cams: ['wide', [PH.x + 20, 960, 2.6]], a: 'grin', b: 'think' },
    { text: '«Татарстан.<br>Под Казанью»', cams: [[B.head.x - 90, 1000, 2.0], 'wide'], a: 'grin', b: 'cool' },
    { text: '«Ты там был?!»', cams: [[A.head.x + 100, 1000, 2.0], [A.head.x + 40, 980, 2.5]], a: 'shock' },
    { text: '«Нет. Я как<br>полинезийцы»', cams: [[B.head.x - 90, 1000, 2.0], 'wide'], a: 'doubt', b: 'smile' },
  ],
  pics: ['каноэ днём', 'звёзды ночью', 'остров и птицы'],
  art: [day, stars, island],
  shots: [
    { img: 1, fx: 560, fy: 1000, s: 1, ds: 1.1, label: '1976: 4000 км по океану' },
    { img: 1, fx: 260, fy: 960, s: 2.3, dx: 20, label: 'Без карт и компаса' },
    { img: 2, fx: 640, fy: 760, s: 1.15, dy: -120, label: 'Штурман читал звёзды' },
    { img: 1, fx: 600, fy: 1600, s: 1.5, dx: 80, label: 'Волны…' },
    { img: 3, fx: 760, fy: 560, s: 1.6, dx: 30, dy: -20, label: '…и птиц' },
    { img: 3, fx: 780, fy: 1060, s: 2.1, ds: 1.1, label: 'И вышел точно к Таити' },
    { img: 3, fx: 680, fy: 1150, s: 1.9, ds: 0.58, label: '' },
  ],
  cta: { lines: ['Место выдают<br>мелочи', 'Бот видит их<br>за минуту'], accent: 1 },
  bioGlyph: '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>',
  bioText: 'Бот в био',
  music: 'plan.wav',
};
