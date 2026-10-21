/**
 * Движок «живых» роликов — по образцам Артёма от 21.10.2026 (ролики IQuit: лифт, спальня, библиотека).
 * Формат: ночная сцена с обстановкой и светом; человечки двигаются (руки, голова, моргание, свет телефона);
 * монтаж «через плечо» с размытым силуэтом на переднем плане; цитата сверху держится всю реплику;
 * посередине — инфографика поверх затемнённой сцены; продукт крупно в телефоне в руках; финал;
 * карточка «… в Telegram». ~36 секунд.
 *
 * Руки — две вложенные группы (плечо и локоть), их поворачивает GSAP: так позы меняются плавно.
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { FACE_KEYS, bracketIcon, faces, type Face, type Pen } from './draw.ts';
import { FONTS } from './engine3.ts';

export const W = 1080;
export const H = 1920;
export const C6 = {
  bg: '#07090d',
  line: '#f4f4f2',
  dim: '#9aa0aa',
  wall: '#12161d',
  dark: '#0b0e13',
  accent: '#ff8a2a',
  green: '#3fd27a',
  screen: '#cfe6ff',
};
export const PEN: Pen = { ink: C6.line, fill: '#000', accent: C6.accent, dark: true };

// ─── Человечек ────────────────────────────────────────────────────────────────

export type Side = 'L' | 'R';
export interface Fig {
  svg: string;
  id: string;
  head: { x: number; y: number };
  /** Плечо и локоть (локоть — в координатах руки, опущенной вниз). */
  sh: Record<Side, [number, number]>;
  el: Record<Side, [number, number]>;
  neck: [number, number];
}
export interface FigOpts {
  id: string;
  x: number;
  /** Сидит (на диване) или стоит. */
  pose: 'sit' | 'stand';
  /** Нижняя точка (пол). */
  floor: number;
  hair?: 'none' | 'spiky' | 'long' | 'cap' | 'curly';
  face?: Face;
  /** Телефон в руке: какой. */
  phone?: Side;
  /** Поворот телефона в кисти (чтобы в позе «смотрит в телефон» он стоял ровно). */
  phoneRot?: number;
}

const UP = 85; // плечо → локоть
const FORE = 80; // локоть → кисть

function hairSvg(kind: FigOpts['hair']): string {
  switch (kind) {
    case 'spiky':
      return '<path d="M-34,-40 l-6,-24 l18,13 l6,-26 l14,23 l14,-21 l2,27 l21,-11 l-9,24"/>';
    case 'long':
      return '<path d="M-54,-8 Q-56,-66 0,-66 Q56,-66 54,-8 M-54,-8 Q-62,52 -44,78 M54,-8 Q62,52 44,78 M-42,-48 Q0,-30 42,-48"/>';
    case 'cap':
      return `<path d="M-54,-16 Q-52,-68 0,-70 Q52,-68 54,-16 Z M48,-20 L92,-12 Q86,-3 50,-8" fill="#000"/><path d="M-32,-44 h58"/>`;
    case 'curly':
      return '<path d="M-48,-32 q-6,-20 13,-26 q4,-22 26,-15 q13,-17 32,-4 q22,-6 24,15 q15,9 6,26"/>';
    default:
      return '';
  }
}

export function figure(o: FigOpts): Fig {
  const x = o.x;
  const sit = o.pose === 'sit';
  const hipY = sit ? o.floor - 178 : o.floor - 160;
  const neckY = hipY - 160;
  const headY = neckY - 60;
  const sy = neckY + 26;
  const sh: Record<Side, [number, number]> = { L: [x - 6, sy], R: [x + 6, sy] };
  const el: Record<Side, [number, number]> = { L: [x - 6, sy + UP], R: [x + 6, sy + UP] };
  const legs = sit
    ? `<path d="M${x - 8},${hipY + 4} L${x - 58},${hipY + 26} L${x - 62},${o.floor} l-24,0 M${x + 8},${hipY + 4} L${x + 58},${hipY + 26} L${x + 62},${o.floor} l24,0"/>
       <path d="M${x - 30},${hipY + 6} H${x + 30}" stroke-width="5"/>`
    : `<path d="M${x - 26},${o.floor} L${x},${hipY} L${x + 26},${o.floor}"/>`;
  const arm = (s: Side) => {
    const [sx, syy] = sh[s];
    const [ex, ey] = el[s];
    const item =
      o.phone === s
        ? `<g transform="translate(${ex} ${ey + FORE}) rotate(${o.phoneRot ?? 0})">
            <ellipse id="${o.id}_glow" cx="0" cy="0" rx="70" ry="70" fill="url(#phoneGlow)" stroke="none" opacity="0"/>
            <rect x="-17" y="-31" width="34" height="62" rx="7" fill="#000" stroke-width="4"/>
            <rect id="${o.id}_scr" x="-11" y="-23" width="22" height="44" rx="3" fill="${C6.screen}" stroke="none" opacity="0.15"/>
          </g>`
        : '';
    return `<g id="${o.id}_a${s}"><path d="M${sx},${syy} L${ex},${ey}"/><g id="${o.id}_f${s}"><path d="M${ex},${ey} L${ex},${ey + FORE}"/>${item}</g></g>`;
  };
  const set = faces(PEN, 1);
  const faceGroups = FACE_KEYS.map(
    (k) => `<g id="${o.id}_face_${k}" class="${o.id}_face" stroke-width="4" opacity="${k === (o.face ?? 'neutral') ? 1 : 0}">${set[k]}</g>`,
  ).join('');
  const svg = `<g id="${o.id}">
    ${legs}<path d="M${x},${hipY} L${x},${neckY}"/>
    ${arm('L')}${arm('R')}
    <g id="${o.id}_head"><g transform="translate(${x} ${headY})">
      <ellipse id="${o.id}_light" cx="0" cy="10" rx="90" ry="80" fill="url(#faceLight)" stroke="none" opacity="0"/>
      <circle r="56" fill="#000"/>${hairSvg(o.hair)}
      <g id="${o.id}_eyes">${faceGroups}</g>
    </g></g>
  </g>`;
  return { svg, id: o.id, head: { x, y: headY }, sh, el, neck: [x, neckY] };
}

/** Поза руки: отвод плеча наружу и сгиб локтя (градусы; + — наружу и вверх). */
export type Pose = [number, number];
export const POSE = {
  rest: [14, -38] as Pose, // рука на коленях
  phone: [12, -150] as Pose, // держит телефон перед собой
  wave: [52, 78] as Pose, // поднятая ладонь, жест
  point: [78, 12] as Pose, // показывает на собеседника
  shrug: [36, 96] as Pose, // «не знаю»
  down: [6, 4] as Pose, // висит
  hip: [40, -100] as Pose, // рука в бок
  up: [150, 10] as Pose, // поднята вверх
};

const sgn = (s: Side) => (s === 'L' ? 1 : -1);

/** Твины: рука плавно в позу к моменту t. */
export function pose(f: Fig, s: Side, p: Pose, t: number, d = 0.35): string {
  const [a1, a2] = p;
  const sh = f.sh[s];
  const el = f.el[s];
  if (d <= 0)
    return `tl.set('#${f.id}_a${s}', { rotation: ${a1 * sgn(s)}, svgOrigin: '${sh[0]} ${sh[1]}' }, ${t.toFixed(3)});
      tl.set('#${f.id}_f${s}', { rotation: ${a2 * sgn(s)}, svgOrigin: '${el[0]} ${el[1]}' }, ${t.toFixed(3)});`;
  return `tl.to('#${f.id}_a${s}', { rotation: ${a1 * sgn(s)}, svgOrigin: '${sh[0]} ${sh[1]}', duration: ${d}, ease: 'power2.inOut' }, ${t.toFixed(3)});
      tl.to('#${f.id}_f${s}', { rotation: ${a2 * sgn(s)}, svgOrigin: '${el[0]} ${el[1]}', duration: ${d}, ease: 'power2.inOut' }, ${t.toFixed(3)});`;
}

/** Помахать предплечьем (жест во время реплики): n покачиваний от позы p. */
export function wave(f: Fig, s: Side, p: Pose, t: number, n = 3, amp = 16): string {
  const el = f.el[s];
  return `tl.to('#${f.id}_f${s}', { rotation: ${(p[1] + amp) * sgn(s)}, svgOrigin: '${el[0]} ${el[1]}', duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: ${n * 2 - 1} }, ${t.toFixed(3)});`;
}

/** Лицо. */
export const face = (f: Fig, k: Face, t: number) =>
  `tl.set('.${f.id}_face', { opacity: 0 }, ${t.toFixed(3)}); tl.set('#${f.id}_face_${k}', { opacity: 1 }, ${t.toFixed(3)});`;

/** Наклон головы (градусы) к моменту t. */
export const tilt = (f: Fig, deg: number, t: number, d = 0.4) =>
  `tl.to('#${f.id}_head', { rotation: ${deg}, svgOrigin: '${f.neck[0]} ${f.neck[1]}', duration: ${d}, ease: 'power2.inOut' }, ${t.toFixed(3)});`;

/** Кивок. */
export const nod = (f: Fig, t: number, n = 2) =>
  `tl.to('#${f.id}_head', { y: 10, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: ${n * 2 - 1} }, ${t.toFixed(3)});`;

/** Моргания по списку моментов. */
export const blinks = (f: Fig, times: number[]) =>
  times
    .map((t) => {
      const [x, y] = [f.head.x, f.head.y - 6];
      return `tl.to('#${f.id}_eyes', { scaleY: 0.12, svgOrigin: '${x} ${y}', duration: 0.06 }, ${t.toFixed(3)}); tl.to('#${f.id}_eyes', { scaleY: 1, svgOrigin: '${x} ${y}', duration: 0.08 }, ${(t + 0.09).toFixed(3)});`;
    })
    .join('\n      ');

/** Экран телефона загорается / гаснет (с подсветкой лица). */
export const screen = (f: Fig, on: boolean, t: number) =>
  `tl.to('#${f.id}_scr', { opacity: ${on ? 0.95 : 0.15}, duration: 0.25 }, ${t.toFixed(3)});
      tl.to('#${f.id}_glow', { opacity: ${on ? 0.9 : 0}, duration: 0.3 }, ${t.toFixed(3)});
      tl.to('#${f.id}_light', { opacity: ${on ? 0.8 : 0}, duration: 0.3 }, ${t.toFixed(3)});`;

// ─── Монтаж ───────────────────────────────────────────────────────────────────

export interface Shot {
  t: number;
  /** Куда смотрит камера (центр кадра в координатах сцены) и масштаб. */
  fx: number;
  fy: number;
  s: number;
  /** Наезд к концу кадра (×). */
  ds?: number;
  /** Размытый силуэт собеседника на переднем плане. */
  fg?: Side;
}
export interface Line6 {
  t: number;
  text: string;
}

const camAt = (fx: number, fy: number, s: number) => ({ x: 540 - fx * s, y: 1020 - fy * s, scale: s });

export function shotTweens(shots: Shot[], end: number, cam = '#cam'): string {
  return shots
    .map((k, i) => {
      const t1 = shots[i + 1]?.t ?? end;
      const fg = `tl.set('.fg', { opacity: 0 }, ${k.t.toFixed(3)});${k.fg ? ` tl.set('#fg${k.fg}', { opacity: 1 }, ${k.t.toFixed(3)});` : ''}`;
      return `tl.set('${cam}', ${JSON.stringify(camAt(k.fx, k.fy, k.s))}, ${k.t.toFixed(3)});
      tl.to('${cam}', { ...${JSON.stringify(camAt(k.fx, k.fy, k.s * (k.ds ?? 1.035)))}, duration: ${(t1 - k.t).toFixed(3)}, ease: 'none' }, ${k.t.toFixed(3)});
      ${fg}`;
    })
    .join('\n      ');
}

export function captions(lines: Line6[], end: number): { html: string; tweens: string } {
  const html = lines
    .map((l, i) => {
      const t1 = lines[i + 1]?.t ?? end;
      return l.text ? `<div class="clip cap6" data-start="${l.t}" data-duration="${(t1 - l.t).toFixed(3)}"><span>${l.text}</span></div>` : '';
    })
    .join('\n      ');
  return { html, tweens: '' };
}

/** Силуэты «через плечо» (слева или справа внизу, размыты). */
export const FOREGROUND = `
  <svg class="fg" id="fgL" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g fill="#000">
    <circle cx="150" cy="1560" r="190"/><path d="M-200,2000 C-180,1760 -20,1700 150,1700 C330,1700 470,1790 500,2000 Z"/></g></svg>
  <svg class="fg" id="fgR" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g fill="#000">
    <circle cx="930" cy="1560" r="190"/><path d="M580,2000 C610,1790 750,1700 930,1700 C1100,1700 1260,1760 1280,2000 Z"/></g></svg>`;

export const DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
  <radialGradient id="phoneGlow"><stop offset="0" stop-color="#bfe0ff" stop-opacity="0.75"/><stop offset="1" stop-color="#bfe0ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="faceLight"><stop offset="0.45" stop-color="#9fc8ff" stop-opacity="0.55"/><stop offset="1" stop-color="#9fc8ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffb26b" stop-opacity="0.55"/><stop offset="1" stop-color="#ffb26b" stop-opacity="0"/></radialGradient>
  <radialGradient id="sunGlow"><stop offset="0" stop-color="#ffb070" stop-opacity="0.8"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1117"/><stop offset="1" stop-color="#1a1f28"/></linearGradient>
  <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1a2b"/><stop offset="0.6" stop-color="#2a3550"/><stop offset="1" stop-color="#5a4a52"/></linearGradient>
</defs></svg>`;

export const svg6 = (body: string, stroke = 6, extra = '') =>
  `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" overflow="visible" style="position:absolute;left:0;top:0" ${extra}><g fill="none" stroke="${C6.line}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

export const CSS6 = `
      ${FONTS}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C6.bg}; font-family: 'Montserrat', sans-serif; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
      .fg { position: absolute; left: 0; top: 0; opacity: 0; filter: blur(22px); }
      .grain { position: absolute; inset: 0; pointer-events: none; background: url(grain-dark.png), radial-gradient(80% 60% at 50% 48%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%); mix-blend-mode: multiply; opacity: 0.9; }
      .cap6 { position: absolute; left: 60px; right: 60px; top: 300px; text-align: center; font-size: 46px; line-height: 1.28; font-weight: 700; color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8); z-index: 5; }
      .label6 { position: absolute; left: 50px; top: 210px; font-size: 26px; font-weight: 600; letter-spacing: 3px; color: #c9ced8; z-index: 5; }
      .label6 b { color: #ff4a3a; margin-left: 14px; }
      .over { position: absolute; inset: 0; z-index: 3; opacity: 0; }
      .ih { position: absolute; left: 40px; right: 40px; text-align: center; font-weight: 800; letter-spacing: 3px; font-size: 34px; color: #fff; }
      .ih .acc, .acc { color: ${C6.accent}; }
      .src6 { position: absolute; left: 70px; right: 70px; bottom: 150px; text-align: center; font-size: 20px; line-height: 1.35; color: #7d838e; }
      .ctaBox6 { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 200px; }
      #ctaIcon { width: 220px; height: 220px; }
      #ctaText { margin-top: 30px; font-size: 54px; font-weight: 400; color: #fff; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 9; }`;

export const ctaIcon = (glyph: string) =>
  bracketIcon(`<rect x="-46" y="-46" width="92" height="92" rx="20" fill="#1c1c1e" stroke="#1c1c1e"/><g stroke="#4a4a4e" stroke-width="5">${glyph}</g>`, C6.line, C6.line);

export interface Video6 {
  id: string;
  title: string;
  end: number;
  /** Слои (HTML) по порядку и все анимации. */
  body: string;
  tweens: string;
}

export function buildVideo6(v: Video6): string {
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${v.title}</title>
    <script src="gsap.min.js"></script>
    <style>${CSS6}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${v.end}" data-width="${W}" data-height="${H}">
      ${DEFS}
      <audio id="music" src="music.wav" data-start="0" data-duration="${v.end}" data-volume="1"></audio>
      ${v.body}
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${v.tweens}
      tl.set({}, {}, ${v.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

export function writeVideo6(v: Video6): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo6(v));
  writeFileSync(new URL('duration.txt', dir), String(v.end));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  return dir.pathname;
}
