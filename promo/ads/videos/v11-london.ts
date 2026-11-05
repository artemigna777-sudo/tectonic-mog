/**
 * 11. «Знакомый из чата пишет: „Я в Москве!“» — рисовка и схема ролика 10 (плоская детальная графика, подписи по
 * слову, бирки и штампы). 26,15 с, музыка — как у 04 («Белоснежка»): дроп 7,23 с — история, инфографика 15,37 с,
 * вывод 21,67 с, «Бот в био» 24,4 с.
 * История: Колумб в 1492 году приплыл к Багамам, но до конца жизни считал, что достиг Азии (Индии) — отсюда «индейцы».
 * Подсказки на фото: красный двухэтажный автобус и красная телефонная будка — так выглядит Лондон, не Москва.
 */
import { readFileSync } from 'node:fs';
import { ctaIcon, type Video6 } from '../engine6.ts';
import { rng } from '../etch.ts';

const END = 26.15;
const T = { story: 7.23, s2: 9.97, s3: 12.67, info: 15.37, map: 18.2, cta: 21.67, bio: 24.4 };

const font = (f: string) => readFileSync(new URL(`../../video/fonts/${f}`, import.meta.url)).toString('base64');
const CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const FONTS10 = ['oswald', 'caveat']
  .map((n) => {
    const fam = n === 'oswald' ? 'Oswald' : 'Caveat';
    return `@font-face { font-family: '${fam}'; font-weight: 200 700; src: url(data:font/woff2;base64,${font(`${n}-cyrillic.woff2`)}) format('woff2'); unicode-range: ${CYR}; }
      @font-face { font-family: '${fam}'; font-weight: 200 700; src: url(data:font/woff2;base64,${font(`${n}-latin.woff2`)}) format('woff2'); unicode-range: U+0000-00FF, U+2000-206F; }`;
  })
  .join('\n      ');

// ─── Палитра образца ─────────────────────────────────────────────────────────

const K = {
  night: '#141a2a', night2: '#222a42', star: '#e8e6f0', moon: '#f1ecdc',
  plank: '#4d3629', plank2: '#563c2d', gap: '#35251c', beam: '#3a2a21',
  floor: '#2a201b', floor2: '#251c18', trim: '#e9e2d3', frame: '#6c4b36',
  forest: '#11141f', red: '#d8473c', paper: '#efe3c6', ink: '#2b2622',
  skin: '#e2a47d', skin2: '#c98a6a', lamp: '#ffc26a',
};

// ─── Человек в плоском стиле (вид сбоку, ноги в (0,0), рост ≈ 560) ─────────────

interface Pal { coat: string; coat2: string; pants: string; pants2: string; hat?: string; hat2?: string; hair?: string; beard?: string }
interface PersonOpts { id: string; x: number; y: number; s?: number; dir?: 1 | -1; c: Pal; head: 'beanie' | 'hair' | 'brim'; body?: 'parka' | 'sweater' | 'coat'; prop?: string; propB?: string }

const ARM = 168;
function arm(id: string, sx: number, sy: number, col: string, cuff: string, prop = '') {
  return `<g transform="translate(${sx},${sy})"><g id="${id}">
    <rect x="-18" y="-12" width="36" height="${ARM + 6}" rx="18" fill="${col}"/>
    <rect x="-18" y="${ARM - 20}" width="36" height="14" fill="${cuff}"/>
    <circle cx="0" cy="${ARM + 8}" r="16" fill="${K.skin}"/>${prop}</g></g>`;
}

function person(o: PersonOpts): string {
  const { id, c } = o;
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const body = o.body ?? 'parka';
  const hem = body === 'coat' ? -120 : body === 'sweater' ? -230 : -184;
  const legTop = body === 'coat' ? -140 : -210;
  const hatSvg =
    o.head === 'beanie'
      ? `<path d="M-50,-4 Q-56,-68 2,-72 Q58,-68 54,-4 Z" fill="${c.hat}"/><rect x="-54" y="-22" width="110" height="24" rx="9" fill="${c.hat2}"/>
         ${[-40, -26, -12, 2, 16, 30, 44].map((x) => `<rect x="${x}" y="-19" width="4" height="18" rx="2" fill="${c.hat}" opacity="0.5"/>`).join('')}`
      : o.head === 'brim'
        ? `<path d="M-36,-28 Q-36,-84 6,-86 Q46,-84 44,-28 Z" fill="${c.hat}"/><rect x="-36" y="-44" width="80" height="14" fill="${c.hat2}"/><ellipse cx="6" cy="-28" rx="74" ry="13" fill="${c.hat2}"/>`
        : `<path d="M-50,10 Q-60,-62 2,-64 Q52,-64 52,-22 Q34,-38 12,-32 Q-6,-22 -26,-28 Q-34,-12 -32,12 Z" fill="${c.hair}"/><path d="M-6,-62 Q24,-70 46,-46 Q30,-48 18,-40 Z" fill="${c.hair}"/>`;
  const beard = c.beard
    ? `<path d="M-28,8 Q-36,66 10,76 Q54,70 50,20 Q38,38 12,36 Q-12,34 -28,8 Z" fill="${c.beard}"/><path d="M18,28 Q36,20 52,28 Q36,36 18,28 Z" fill="${c.beard}"/>`
    : '';
  return `<g transform="translate(${o.x},${o.y}) scale(${dir * s},${s})">
    <ellipse cx="6" cy="2" rx="96" ry="13" fill="#000" opacity="0.32"/>
    ${arm(`${id}-armB`, -24, -404, c.coat2, c.coat2, o.propB)}
    <rect x="-36" y="${legTop}" width="32" height="${-legTop - 12}" fill="${c.pants2}"/>
    <rect x="0" y="${legTop}" width="34" height="${-legTop - 12}" fill="${c.pants}"/>
    <rect x="-42" y="-24" width="50" height="24" rx="10" fill="#16171c"/><rect x="-2" y="-24" width="60" height="24" rx="10" fill="#1d1e24"/>
    <path d="M-58,-410 Q-60,-430 -30,-434 H34 Q62,-430 62,-410 L70,${hem - 12} Q70,${hem + 2} 56,${hem + 2} H-62 Q-76,${hem + 2} -74,${hem - 12} Z" fill="${c.coat}"/>
    <path d="M-58,-410 Q-60,-430 -30,-434 H-6 L-16,${hem + 2} H-62 Q-76,${hem + 2} -74,${hem - 12} Z" fill="${c.coat2}" opacity="0.5"/>
    ${body === 'sweater'
      ? `${[-380, -340, -300].map((y) => `<path d="M-64,${y} H66" stroke="${c.coat2}" stroke-width="6" opacity="0.6"/>`).join('')}<rect x="-72" y="${hem - 18}" width="142" height="20" rx="8" fill="${c.coat2}"/>`
      : `<path d="M26,-424 V${hem}" stroke="${c.coat2}" stroke-width="4"/><rect x="32" y="-292" width="30" height="9" rx="3" fill="${c.coat2}"/><rect x="-74" y="${hem - 20}" width="144" height="22" rx="8" fill="${c.coat2}"/>`}
    <path d="M-34,-436 Q6,-404 46,-436 L42,-452 Q6,-428 -30,-452 Z" fill="${c.coat2}"/>
    <rect x="-4" y="-470" width="28" height="44" fill="${K.skin2}"/>
    <g transform="translate(10,-506)"><g id="${id}-head">
      <ellipse cx="0" cy="0" rx="46" ry="54" fill="${K.skin}"/>
      <ellipse cx="-18" cy="6" rx="10" ry="14" fill="${K.skin2}"/>
      <circle cx="44" cy="8" r="11" fill="${K.skin}"/>
      <circle cx="22" cy="20" r="10" fill="#ec8f78" opacity="0.35"/>
      ${beard}
      <g transform="translate(24,-4)"><g id="${id}-eye"><ellipse rx="5.5" ry="7" fill="#1d1d25"/></g></g>
      <path d="M14,-22 q10,-6 22,-1" stroke="#3a2a22" stroke-width="5" stroke-linecap="round" fill="none"/>
      <g transform="translate(30,32)"><g id="${id}-mouth"><ellipse rx="8" ry="2.6" fill="#7a3b33"/></g></g>
      ${hatSvg}
    </g></g>
    ${arm(`${id}-armF`, 24, -404, c.coat, c.coat2, o.prop)}
  </g>`;
}

const rot = (sel: string, r: number, t: number, d = 0.3, ease = 'power2.out') =>
  `tl.to('${sel}', { rotation: ${r}, svgOrigin: '0 0', duration: ${d}, ease: '${ease}' }, ${t.toFixed(3)});`;
const setRot = (sel: string, r: number) => `tl.set('${sel}', { rotation: ${r}, svgOrigin: '0 0' }, 0);`;
const blink = (id: string, ts: number[]) =>
  ts.map((t) => `tl.to('#${id}-eye', { scaleY: 0.12, svgOrigin: '0 0', duration: 0.06, yoyo: true, repeat: 1 }, ${t.toFixed(3)});`).join('\n      ');
const talk = (id: string, t0: number, t1: number) => {
  const n = Math.max(1, Math.floor((t1 - t0) / 0.18) * 2 - 1);
  return `tl.to('#${id}-mouth', { scaleY: 3, scaleX: 0.8, svgOrigin: '0 0', duration: 0.09, yoyo: true, repeat: ${n}, ease: 'sine.inOut' }, ${t0.toFixed(3)});`;
};

// ─── Камера: точка сцены (fx, fy) → центр интереса кадра (540, 640) ──────────

interface Shot { t: number; fx: number; fy: number; s: number; ds?: number }
const camAt = (fx: number, fy: number, s: number) => ({ x: +(540 - fx * s).toFixed(1), y: +(640 - fy * s).toFixed(1), scale: s });
function cam(id: string, shots: Shot[], end: number): string {
  return shots
    .map((k, i) => {
      const t1 = shots[i + 1]?.t ?? end;
      return `tl.set('#${id}', ${JSON.stringify(camAt(k.fx, k.fy, k.s))}, ${k.t.toFixed(3)});
      tl.to('#${id}', { ...${JSON.stringify(camAt(k.fx, k.fy, k.s * (k.ds ?? 1.04)))}, duration: ${(t1 - k.t).toFixed(3)}, ease: 'none' }, ${k.t.toFixed(3)});`;
    })
    .join('\n      ');
}

const svgScene = (body: string) => `<svg viewBox="0 0 1080 1920" width="1080" height="1920" overflow="visible" style="position:absolute;left:0;top:0">${body}</svg>`;

const stars = (seed: number, n: number, x0: number, x1: number, y0: number, y1: number, cls = 'tw') => {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => `<circle class="${cls}${i % 3}" cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${(1.4 + r() * 2.2).toFixed(1)}" fill="${K.star}" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`).join('');
};
const forest = (seed: number, x0: number, x1: number, base: number, h: number, col: string) => {
  const r = rng(seed);
  let d = `M${x0},${base + 400} L${x0},${base}`;
  for (let x = x0; x < x1; x += 22 + r() * 20) {
    const th = h * (0.55 + r() * 0.6);
    d += ` L${(x + 8).toFixed(0)},${(base - th * 0.5).toFixed(0)} L${(x + 13).toFixed(0)},${(base - th).toFixed(0)} L${(x + 18).toFixed(0)},${(base - th * 0.5).toFixed(0)} L${(x + 26).toFixed(0)},${base}`;
  }
  return `<path d="${d} L${x1},${base} L${x1},${base + 400} Z" fill="${col}"/>`;
};
const moon = (x: number, y: number, r = 34) =>
  `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="${K.moon}" opacity="0.06"/><circle cx="${x}" cy="${y}" r="${r * 2}" fill="${K.moon}" opacity="0.1"/><circle cx="${x}" cy="${y}" r="${r}" fill="${K.moon}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#d9d2bf"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.3}" r="${r * 0.12}" fill="#d9d2bf"/>`;

// ─── Старое фото (640×440, белая рамка) ──────────────────────────────────────

const PHOTO_TOWER: [number, number] = [250, 300];
const PHOTO_BEND: [number, number] = [520, 300];
const oldPhoto = (id: string) => `
  <g id="${id}">
    <rect x="-28" y="-28" width="696" height="560" fill="#f4f1ea"/>
    <defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c4d2"/><stop offset="1" stop-color="#dfe2e6"/></linearGradient>
      <clipPath id="${id}-clip"><rect width="640" height="440"/></clipPath></defs>
    <g clip-path="url(#${id}-clip)">
      <rect width="640" height="440" fill="url(#${id}-sky)"/>
      <g fill="#8a5a48">${[0, 1, 2, 3].map((i) => `<rect x="${i * 170 - 10}" y="${70 + (i % 2) * 24}" width="160" height="${210 - (i % 2) * 24}"/>`).join('')}</g>
      <g fill="#e9e3d4">${[0, 1, 2, 3].map((i) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${i * 170 + 10 + c * 46}" y="${96 + (i % 2) * 24 + r * 54}" width="26" height="36"/>`).join('')).join('')).join('')}</g>
      <rect y="270" width="640" height="170" fill="#4a4d55"/><rect y="262" width="640" height="14" fill="#a9a699"/>
      <path d="M0,360 H640" stroke="#e9e3d4" stroke-width="4" stroke-dasharray="40 30"/>
      <g transform="translate(120,226)">
        <rect x="0" y="0" width="260" height="116" rx="10" fill="#c8342c"/><rect x="0" y="52" width="260" height="8" fill="#a82a24"/>
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="${14 + i * 48}" y="12" width="36" height="34" rx="4" fill="#dfe8f0"/><rect x="${14 + i * 48}" y="66" width="36" height="34" rx="4" fill="#dfe8f0"/>`).join('')}
        <rect x="10" y="-26" width="240" height="30" rx="6" fill="#b52d26"/><text x="130" y="-5" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="22" fill="#f4e6c4">73</text>
        <circle cx="52" cy="118" r="20" fill="#1a1b20"/><circle cx="52" cy="118" r="9" fill="#777"/><circle cx="208" cy="118" r="20" fill="#1a1b20"/><circle cx="208" cy="118" r="9" fill="#777"/>
      </g>
      <g transform="translate(494,236)"><rect width="56" height="116" fill="#c8342c"/><rect x="-6" y="-8" width="68" height="14" fill="#a82a24"/>
        ${[0, 1, 2].map((r) => [0, 1].map((c) => `<rect x="${8 + c * 24}" y="${16 + r * 30}" width="18" height="24" fill="#f0e6c8" opacity="0.85"/>`).join('')).join('')}</g>
      <g transform="translate(600,150)"><rect x="-6" y="0" width="12" height="212" fill="#2d3038"/><circle cx="0" cy="-6" r="24" fill="#f6e3a0"/></g>
      <path d="M60,420 L200,372 M130,425 L270,380" stroke="#e9e3d4" stroke-width="3" opacity="0.5"/>
    </g>
    <text x="320" y="508" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="44" fill="#2b2622">Я в Москве!</text>
  </g>`;

// ─── Сцена 1: квартира Лизы вечером ───────────────────────────────────────

const FLOOR = 1060;
const FEET = 1150;
const LESHA: Pal = { coat: '#7a4f9a', coat2: '#5f3b7c', pants: '#2a2f3c', pants2: '#222631', hair: '#2a1a14' };
const DIMA: Pal = { coat: '#2f7f86', coat2: '#246269', pants: '#2f3446', pants2: '#262a39', hair: '#c9a05a' };
const photoProp = `<g transform="translate(16,${ARM + 6}) rotate(-90)"><rect x="-26" y="-48" width="52" height="96" rx="9" fill="#14161c"/><rect x="-21" y="-43" width="42" height="86" rx="6" fill="#bcd8ff"/><rect x="-16" y="-20" width="26" height="12" rx="5" fill="#fff"/></g>`;

const roomBg = (() => {
  const planks = Array.from({ length: 26 }, (_, i) => {
    const x = -600 + i * 92;
    return `<rect x="${x}" y="-400" width="92" height="${FLOOR + 400}" fill="${i % 2 ? K.plank : K.plank2}"/><rect x="${x}" y="-400" width="5" height="${FLOOR + 400}" fill="${K.gap}"/>${i % 3 === 0 ? `<circle cx="${x + 40}" cy="${300 + ((i * 137) % 600)}" r="6" fill="${K.gap}" opacity="0.7"/>` : ''}`;
  }).join('');
  const floorLines = Array.from({ length: 9 }, (_, i) => `<path d="M-600,${FLOOR + 30 + i * i * 14} H1700" stroke="${K.floor2}" stroke-width="${3 + i}"/>`).join('');
  return `
  ${planks}
  <rect x="-600" y="-400" width="2300" height="470" fill="${K.beam}"/><rect x="-600" y="60" width="2300" height="16" fill="#2c2019"/>
  <g>
    <rect x="96" y="250" width="380" height="440" fill="${K.frame}"/>
    <rect x="118" y="272" width="336" height="396" fill="${K.night}"/>
    <rect x="118" y="470" width="336" height="198" fill="${K.night2}" opacity="0.6"/>
    ${stars(4, 22, 124, 450, 280, 520)}
    ${moon(380, 352, 30)}
    <g clip-path="url(#winClip)">${forest(9, 110, 470, 640, 120, K.forest)}<rect x="110" y="640" width="370" height="40" fill="#1a1e2d"/></g>
    <rect x="276" y="272" width="16" height="396" fill="${K.frame}"/><rect x="118" y="462" width="336" height="16" fill="${K.frame}"/>
    <rect x="80" y="684" width="412" height="26" fill="#7a5640"/><rect x="80" y="708" width="412" height="8" fill="#3a2a21"/>
    <rect x="96" y="250" width="380" height="14" fill="#7d5a43"/>
  </g>
  <g>
    <rect x="600" y="330" width="140" height="190" fill="#e7dcc3"/><rect x="600" y="330" width="140" height="44" fill="${K.red}"/>
    <text x="670" y="364" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="30" fill="#fff">2026</text>
    ${Array.from({ length: 20 }, (_, i) => `<rect x="${612 + (i % 5) * 25}" y="${390 + Math.floor(i / 5) * 28}" width="16" height="14" fill="${i === 12 ? K.red : '#bfb39a'}"/>`).join('')}
    <circle cx="670" cy="318" r="5" fill="#2c2019"/>
  </g>
  <g>
    <rect x="560" y="610" width="270" height="14" fill="#6e4d38"/><rect x="560" y="624" width="270" height="6" fill="#2c2019"/>
    <rect x="574" y="540" width="40" height="70" rx="8" fill="#9fb7c4" opacity="0.6"/><rect x="574" y="566" width="40" height="44" rx="6" fill="#c8553c"/>
    <rect x="624" y="552" width="36" height="58" rx="8" fill="#9fb7c4" opacity="0.6"/><rect x="624" y="574" width="36" height="36" rx="6" fill="#e2b13c"/>
    <rect x="672" y="534" width="44" height="76" rx="8" fill="#9fb7c4" opacity="0.6"/><rect x="672" y="560" width="44" height="50" rx="6" fill="#6f9a4c"/>
    <rect x="732" y="560" width="22" height="50" fill="#7a3b33"/><rect x="756" y="566" width="18" height="44" fill="#2f4f6f"/><rect x="776" y="556" width="24" height="54" fill="#8a7a52"/>
  </g>
  <g>
    <rect x="860" y="740" width="190" height="${FEET - 740 - 10}" rx="16" fill="#d9dde3"/><rect x="860" y="740" width="190" height="14" rx="6" fill="#eceff3"/>
    <path d="M860,930 H1050" stroke="#a9afb9" stroke-width="5"/><rect x="1020" y="790" width="8" height="90" rx="4" fill="#8a909c"/><rect x="1020" y="960" width="8" height="90" rx="4" fill="#8a909c"/>
    <rect x="884" y="780" width="64" height="48" fill="#e8c14a"/><rect x="896" y="990" width="50" height="56" fill="#cf5a4a" transform="rotate(-4 920 1018)"/>
    <circle class="stoveG" cx="944" cy="1060" r="1" fill="none"/>
  </g>
  <rect x="-600" y="${FLOOR}" width="2300" height="1400" fill="${K.floor}"/>
  ${floorLines}
  <rect x="-600" y="${FLOOR}" width="2300" height="10" fill="#1e1713"/>
  <ellipse cx="540" cy="${FEET + 20}" rx="470" ry="64" fill="#5a2e2a"/><ellipse cx="540" cy="${FEET + 20}" rx="400" ry="48" fill="#6e3a32"/><ellipse cx="540" cy="${FEET + 20}" rx="300" ry="32" fill="#5a2e2a"/>
  <g>
    <rect x="430" y="940" width="230" height="18" rx="4" fill="#6e4d38"/><rect x="430" y="956" width="230" height="8" fill="#3a2a21"/>
    <rect x="444" y="962" width="14" height="${FEET - 962}" fill="#4a3427"/><rect x="632" y="962" width="14" height="${FEET - 962}" fill="#4a3427"/>
    <rect x="460" y="904" width="90" height="36" fill="#8a6748"/><rect x="456" y="900" width="98" height="10" fill="#9a7656"/>
    <rect x="470" y="890" width="40" height="30" fill="#e8dcc0" transform="rotate(-8 490 905)"/><rect x="500" y="886" width="40" height="30" fill="#d8c8a2" transform="rotate(6 520 900)"/>
    <rect x="582" y="926" width="44" height="14" rx="4" fill="#3a3c45"/>
    <rect x="590" y="866" width="28" height="60" rx="12" fill="#f4e6c4" opacity="0.55"/>
    <path class="flame" d="M604,912 Q594,896 604,878 Q614,896 604,912 Z" fill="#ffb347"/>
    <rect x="586" y="860" width="36" height="8" rx="3" fill="#3a3c45"/>
  </g>
  <circle class="lampG" cx="604" cy="890" r="420" fill="url(#lampGlow10)"/>`;
})();

const room = `
  <defs>
    <clipPath id="winClip"><rect x="118" y="272" width="336" height="396"/></clipPath>
    <radialGradient id="lampGlow10"><stop offset="0" stop-color="#ffc26a" stop-opacity="0.42"/><stop offset="0.5" stop-color="#ffb060" stop-opacity="0.12"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
    <radialGradient id="stoveGlow"><stop offset="0" stop-color="#ff8a3a" stop-opacity="0.35"/><stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="-600" y="-400" width="2300" height="2700" fill="${K.plank}"/>
  ${roomBg}
  ${person({ id: 'L', x: 300, y: FEET, s: 0.98, c: LESHA, head: 'hair', body: 'sweater', prop: photoProp })}
  ${person({ id: 'D', x: 760, y: FEET, s: 0.98, dir: -1, c: DIMA, head: 'hair', body: 'parka' })}
  <rect x="-600" y="-400" width="2300" height="2700" fill="#0a0d18" opacity="0.18"/>`;

// ─── История: Шлиман и Троя ──────────────────────────────────────────────────

const SCHLI: Pal = { coat: '#6b3a34', coat2: '#4f2a26', pants: '#2c2a2e', pants2: '#242226', hat: '#2e2a26', hat2: '#3d3731', beard: '#cfc8bc' };
const bookProp = `<g transform="translate(18,${ARM + 4}) rotate(-80)"><path d="M-34,-6 L0,4 L34,-6 L34,34 L0,44 L-34,34 Z" fill="#7a2f2a"/><path d="M-30,-4 L0,6 L30,-4 L30,30 L0,40 L-30,30 Z" fill="#efe3c6"/><path d="M0,6 V40" stroke="#b9a882" stroke-width="2"/></g>`;

const study = `
  <rect x="-600" y="-400" width="2300" height="2700" fill="#1d2833"/>
  ${Array.from({ length: 14 }, (_, i) => `<rect x="${-600 + i * 170}" y="-400" width="6" height="1460" fill="#18222b"/>`).join('')}
  <rect x="140" y="270" width="300" height="380" fill="#3d2c22"/><rect x="160" y="290" width="260" height="340" fill="${K.night}"/>
  ${stars(12, 14, 166, 414, 296, 520)}${moon(340, 360, 28)}
  <g clip-path="url(#stClip)">${forest(14, 150, 430, 600, 90, K.forest)}</g>
  <rect x="282" y="290" width="14" height="340" fill="#3d2c22"/><rect x="160" y="452" width="260" height="14" fill="#3d2c22"/>
  <g transform="translate(560,300) rotate(2)">
    <rect width="380" height="270" fill="#e8dcbc"/><rect x="10" y="10" width="360" height="250" fill="#d9c79f"/>
    <path d="M10,60 Q120,90 170,150 Q210,210 160,260 H10 Z" fill="#9db2a8"/><path d="M200,10 Q240,120 370,140 V10 Z" fill="#9db2a8"/>
    <path d="M150,170 Q230,180 300,230" stroke="#6a8aa8" stroke-width="5" fill="none"/>
    <circle class="mapRing" cx="236" cy="160" r="30" fill="none" stroke="${K.red}" stroke-width="6"/>
    <text x="250" y="240" font-family="Caveat" font-weight="700" font-size="34" fill="#4a3a2a">Индия?</text>
    <circle cx="190" cy="-6" r="7" fill="#7a2f2a"/>
  </g>
  <rect x="-600" y="1060" width="2300" height="1400" fill="#1a1716"/><rect x="-600" y="1060" width="2300" height="10" fill="#121010"/>
  <rect x="520" y="900" width="420" height="22" fill="#5a3e2c"/><rect x="540" y="922" width="20" height="230" fill="#3f2b20"/><rect x="900" y="922" width="20" height="230" fill="#3f2b20"/>
  <path d="M600,898 L700,880 L800,898 L800,904 L600,904 Z" fill="#e9dfc6"/><path d="M700,880 V902" stroke="#b9a882" stroke-width="3"/>
  ${[0, 1, 2, 3].map((i) => `<path d="M${616 + i * 6},${890 - i} H${684}" stroke="#b9a882" stroke-width="2"/><path d="M${716},${890 - i} H${784 - i * 6}" stroke="#b9a882" stroke-width="2"/>`).join('')}
  <text x="650" y="870" font-family="Caveat" font-weight="700" font-size="36" fill="#e9dfc6" class="iliad">Карта</text>
  <rect x="846" y="880" width="30" height="20" rx="5" fill="#3a3c45"/><rect x="852" y="820" width="18" height="60" rx="8" fill="#f4e6c4" opacity="0.55"/><path class="flame" d="M861,862 Q853,848 861,834 Q869,848 861,862 Z" fill="#ffb347"/>
  <circle class="lampG" cx="861" cy="850" r="400" fill="url(#lampGlow10)"/>
  ${person({ id: 'S1', x: 420, y: 1150, s: 0.98, c: SCHLI, head: 'brim', body: 'coat' })}
  <rect x="-600" y="-400" width="2300" height="2700" fill="#0a0d18" opacity="0.15"/>`;

const hill = `
  <defs><linearGradient id="dusk10" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2440"/><stop offset="0.55" stop-color="#5c3e56"/><stop offset="1" stop-color="#8a5a5c"/></linearGradient></defs>
  <rect x="-600" y="-400" width="2300" height="1400" fill="url(#dusk10)"/>
  <circle cx="760" cy="440" r="210" fill="#f2b45e" opacity="0.12"/><circle cx="760" cy="440" r="130" fill="#f2b45e" opacity="0.18"/><circle class="sun" cx="760" cy="440" r="72" fill="#f2b45e"/>
  <rect x="-600" y="660" width="2300" height="500" fill="#4d5f86"/>
  <rect x="-600" y="660" width="2300" height="12" fill="#b9a6b8" opacity="0.55"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path class="wave" d="M${-300 + i * 220},${710 + (i % 3) * 36} h80" stroke="#a7b3cf" stroke-width="4" opacity="0.55"/>`).join('')}
  <g transform="translate(790,700)"><path d="M-70,0 Q-10,-46 70,0 Z" fill="#2f5a3a"/><path d="M-10,-30 Q-26,-76 -40,-82 M-10,-30 Q4,-86 22,-84 M-10,-30 Q-4,-70 -24,-74" stroke="#233f2c" stroke-width="5" fill="none"/></g>
  <g transform="translate(560,0)"><rect x="-18" y="-400" width="36" height="1500" fill="#3a2a21"/>
    <path d="M-260,60 Q-280,330 -250,610 Q0,660 250,610 Q280,330 260,60 Q0,100 -260,60 Z" fill="#eadfc7"/><path d="M-250,610 Q0,660 250,610" stroke="#c9b894" stroke-width="6" fill="none"/>
    <path d="M-130,100 Q-140,360 -130,640 M0,96 Q0,360 0,650 M130,100 Q140,360 130,640" stroke="#d6c7a4" stroke-width="3" opacity="0.7"/>
    <path d="M-262,60 L-560,1090 M262,60 L560,1090" stroke="#2a1f19" stroke-width="3"/></g>
  <rect x="-600" y="1090" width="2300" height="1300" fill="#5a3e2c"/><rect x="-600" y="1070" width="2300" height="26" fill="#7a5640"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M-600,${1150 + i * 46} H1700" stroke="#3a2a21" stroke-width="${3 + i / 2}"/>`).join('')}
  ${[-300, 40, 380, 720, 1060].map((x) => `<rect x="${x}" y="990" width="22" height="100" fill="#3a2a21"/>`).join('')}
  <rect x="-600" y="990" width="2300" height="16" fill="#3a2a21"/>
  ${person({ id: 'S2', x: 230, y: 1150, s: 0.98, c: SCHLI, head: 'brim', body: 'coat', prop: bookProp })}
  <g class="chk" id="chkR"></g>`;

const palm = (x: number, y: number, h: number, cls: string) => `<g class="stone ${cls}"><path d="M${x},${y} Q${x + 18},${y - h / 2} ${x + 8},${y - h}" stroke="#6a4a36" stroke-width="16" fill="none" stroke-linecap="round"/>
  <g transform="translate(${x + 8},${y - h})" fill="#3f7f4a"><path d="M0,0 Q-70,-20 -110,30 Q-50,-4 0,8 Z"/><path d="M0,0 Q70,-24 112,26 Q50,-6 0,8 Z"/><path d="M0,0 Q-40,-62 -84,-60 Q-30,-34 0,4 Z"/><path d="M0,0 Q42,-66 86,-58 Q32,-34 0,4 Z"/><path d="M0,0 Q4,-70 -2,-96 Q20,-50 6,2 Z" fill="#4a9058"/></g></g>`;
const dig = `
  <defs><linearGradient id="dusk11" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2440"/><stop offset="1" stop-color="#7a5060"/></linearGradient></defs>
  <rect x="-600" y="-400" width="2300" height="1100" fill="url(#dusk11)"/>
  <circle cx="300" cy="300" r="60" fill="#f2b45e" opacity="0.9"/><circle cx="300" cy="300" r="120" fill="#f2b45e" opacity="0.12"/>
  <rect x="-600" y="560" width="2300" height="300" fill="#4d6d8a"/><rect x="-600" y="560" width="2300" height="10" fill="#b9a6b8" opacity="0.5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<path d="M${-100 + i * 300},${620 + (i % 2) * 40} h90" stroke="#b6cae0" stroke-width="4" opacity="0.5"/>`).join('')}
  <g transform="translate(160,520)"><path d="M-120,120 Q-120,40 0,34 H200 Q250,40 250,120 Z" fill="#6a4a36"/><rect x="-6" y="-170" width="10" height="210" fill="#3a2a21"/><path d="M4,-150 Q90,-110 4,-20 Z" fill="#eadfc7"/><path d="M-160,20 L0,-80" stroke="#2a1f19" stroke-width="2"/></g>
  <path d="M-600,820 Q0,780 540,800 Q1000,780 1700,820 V2400 H-600 Z" fill="#d9bf8e"/>
  <path d="M-600,900 Q0,870 540,890 Q1000,870 1700,900 V2400 H-600 Z" fill="#c9ad7a"/>
  <path d="M-600,1010 Q0,990 540,1000 Q1000,990 1700,1010 V2400 H-600 Z" fill="#b99a68"/>
  ${palm(250, 880, 330, 'r3')}${palm(400, 900, 250, 'r2')}${palm(820, 890, 340, 'r1')}${palm(940, 880, 270, 'r0')}
  <g transform="translate(540,1010)"><g id="gold"><rect x="-5" y="-230" width="10" height="240" fill="#6a4a36"/><path d="M5,-230 Q70,-250 120,-226 V-160 Q70,-184 5,-160 Z" fill="#c8453c"/><rect x="-14" y="2" width="28" height="12" rx="6" fill="#8a6a4a"/></g></g>
  <g transform="translate(640,800)"><g id="spark" opacity="0"><path d="M0,-40 L8,-8 L40,0 L8,8 L0,40 L-8,8 L-40,0 L-8,-8 Z" fill="#fff6d0"/></g></g>
  <g fill="#a98a58" opacity="0.7">${[300, 420, 470, 700, 760].map((x, i) => `<ellipse cx="${x}" cy="${1060 + (i % 2) * 20}" rx="16" ry="6"/>`).join('')}</g>
  <rect x="-600" y="1150" width="2300" height="1300" fill="#8a7048"/>
  ${Array.from({ length: 18 }, (_, i) => { const r = rng(70 + i); return `<circle class="dust" cx="${(220 + r() * 640).toFixed(0)}" cy="${(700 + r() * 380).toFixed(0)}" r="${(3 + r() * 5).toFixed(0)}" fill="#f0dcae" opacity="0.4"/>`; }).join('')}`;

// ─── Инфографика: фото → карта ───────────────────────────────────────────────

const mapCard = `
  <g id="map">
    <rect x="-28" y="-28" width="696" height="560" fill="#efe8d8"/>
    <rect width="640" height="440" fill="#2f4d72"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${20 + i * 110},${60 + (i % 3) * 120} h50" stroke="#4f7099" stroke-width="3"/>`).join('')}
    <path d="M300,40 L346,76 L332,128 L378,184 L392,250 L356,306 L296,336 L240,326 L270,270 L236,222 L270,168 L256,104 Z" fill="#5b8a52"/>
    <path d="M300,40 L346,76 L332,128 L378,184 L392,250 L356,306 L296,336 L240,326 L270,270 L236,222 L270,168 L256,104 Z" fill="none" stroke="#9cc58f" stroke-width="3"/>
    <path d="M176,170 q-30,16 -24,52 q22,24 52,6 q16,-30 -4,-58 Z" fill="#5b8a52"/>
    <path d="M440,330 q60,-24 130,0 q20,50 -20,80 H450 Z" fill="#6b8f5a" opacity="0.7"/>
    <g transform="translate(560,90)"><circle r="9" fill="#cfd5de"/><text y="40" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="28" fill="#cfd5de">Москва</text><path d="M-22,-22 L22,22 M22,-22 L-22,22" stroke="#d8473c" stroke-width="6"/></g>
    <g transform="translate(364,298)"><g id="pin"><path d="M0,0 C-26,-30 -30,-44 -30,-54 A30,30 0 1 1 30,-54 C30,-44 26,-30 0,0 Z" fill="#ff8a2a"/><circle cy="-54" r="11" fill="#1a1e2d"/></g></g>
  </g>`;

const CARD = { x: 220, y: 300 }; // левый верх фото в кадре (масштаб 1)
const ring = (id: string, [x, y]: [number, number]) =>
  `<g transform="translate(${CARD.x + x},${CARD.y + y})"><g id="${id}" opacity="0">${[40, 74, 110].map((r) => `<circle r="${r}" fill="none" stroke="${K.red}" stroke-width="5" opacity="${(1 - r / 160).toFixed(2)}"/>`).join('')}</g></g>`;
const infoSvg = `
  <rect x="-600" y="-400" width="2300" height="2700" fill="#151a2a"/>
  ${stars(55, 40, 0, 1080, 80, 1000)}
  <g transform="translate(${CARD.x},${CARD.y})"><g id="pcard">${oldPhoto('ph')}</g><g id="mcard" opacity="0">${mapCard}</g></g>
  ${ring('ringT', PHOTO_TOWER)}${ring('ringR', PHOTO_BEND)}`;

// ─── Финал: дом деда ночью, окно загорается ─────────────────────────────────

const house = `
  <rect x="-600" y="-400" width="2300" height="2700" fill="#10131f"/>
  ${stars(77, 50, 0, 1080, 60, 700)}
  <circle class="winG" cx="540" cy="780" r="560" fill="url(#winGlow)" opacity="0"/>
  <defs><radialGradient id="winGlow"><stop offset="0" stop-color="#6ea8ff" stop-opacity="0.3"/><stop offset="1" stop-color="#6ea8ff" stop-opacity="0"/></radialGradient></defs>
  <g transform="translate(540,780)">
    <rect x="-250" y="-440" width="500" height="880" rx="64" fill="#0b0c12"/><rect x="-236" y="-426" width="472" height="852" rx="52" fill="#1a2030"/>
    <rect x="-70" y="-410" width="140" height="30" rx="15" fill="#0b0c12"/>
    <rect x="-236" y="-380" width="472" height="96" fill="#232b40"/><circle cx="-180" cy="-332" r="30" fill="#8a6a9a"/>
    <text x="-130" y="-320" font-family="Oswald" font-weight="700" font-size="38" fill="#e8ecf5">Максим</text>
    <rect x="-200" y="-250" width="340" height="86" rx="26" fill="#2e3850"/><text x="-176" y="-196" font-family="Oswald" font-weight="500" font-size="40" fill="#fff">Я в Москве!</text>
    <rect x="-130" y="-140" width="330" height="86" rx="26" fill="#2e3850"/><text x="-106" y="-86" font-family="Oswald" font-weight="500" font-size="40" fill="#fff">Приезжай ❤</text>
    <g class="win0" opacity="0"><rect x="-200" y="-30" width="400" height="86" rx="26" fill="#2e3850"/><text x="-176" y="24" font-family="Oswald" font-weight="500" font-size="40" fill="#fff">Скинь на билет</text></g>
    <g class="win1" opacity="0"><circle cx="0" cy="190" r="80" fill="#d8473c"/><circle cx="0" cy="190" r="62" fill="none" stroke="#fff" stroke-width="12"/><path d="M-44,146 L44,234" stroke="#fff" stroke-width="12"/></g>
  </g>
  <rect x="-600" y="1250" width="2300" height="1200" fill="#0c0e17"/>`;

// ─── Подписи ─────────────────────────────────────────────────────────────────

interface Cap { t: number; html: string; top?: number }
const caps: Cap[] = [
  { t: 0, html: 'Знакомый пишет:' }, { t: 0.6, html: '<i class="y">«Я в Москве!»</i>' }, { t: 1.2, html: 'Вот фото —' },
  { t: 1.87, html: 'Странно.' }, { t: 2.6, html: '<i class="g">Что-то</i> не так.' },
  { t: 3.73, html: 'Видео' }, { t: 4.4, html: '<i class="g">не шлёт,</i>' }, { t: 5.0, html: '<i class="r">звонить — не может.</i>' },
  { t: 5.6, html: 'Проверим.' }, { t: 6.13, html: 'Как Колумб —' }, { t: 6.7, html: '<i class="y">берег.</i>' },
  { t: T.story, html: 'Колумб' }, { t: 7.7, html: 'приплыл в Америку,' }, { t: 8.63, html: '<i class="r">а думал — Индия.</i>' },
  { t: T.s2, html: 'Он не сверил' }, { t: 10.67, html: '<i class="y">берег с картой</i>' }, { t: 11.37, html: 'и до смерти' }, { t: 11.83, html: 'звал их индейцами —' },
  { t: T.s3, html: 'ошибся' }, { t: 13.37, html: 'местом' }, { t: 14.0, html: '<i class="y">на полмира.</i>' },
  { t: T.info, html: 'Бот заметил' }, { t: 16.3, html: '<i class="y">красный автобус,</i>' }, { t: 17.23, html: '<i class="y">будку</i>' },
  { t: T.map, html: 'и нашёл' }, { t: 19.13, html: '<i class="n">Лондон.</i>' }, { t: 20.3, html: 'За 10 секунд.' },
  { t: T.cta, html: 'Не верь' }, { t: 22.4, html: 'точке в чате —' }, { t: 23.13, html: '<i class="r">проверяй фото.</i>' },
];
const capEnds = (i: number) => {
  const next = caps[i + 1]?.t ?? T.bio;
  return Math.min(next, T.bio);
};
const capHtml = caps.map((c, i) => `<div class="clip cap10" id="cap${i}" data-start="${c.t}" data-duration="${(capEnds(i) - c.t).toFixed(3)}"><span>${c.html}</span></div>`).join('\n      ');
const capTw = caps.map((c, i) => `tl.fromTo('#cap${i} span', { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.14, ease: 'back.out(2)' }, ${c.t.toFixed(3)});`);

// ─── Бирки и карточки ────────────────────────────────────────────────────────

const tag = (txt: string, sub: string) => `<div class="tag10"><b>${txt}</b><small>${sub}</small></div>`;
const who = (id: string, name: string, sub: string, t0: number, t1: number) =>
  `<div class="clip who10" id="${id}" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}"><small>${sub}</small>${name}</div>`;

// ─── Монтаж и анимации ───────────────────────────────────────────────────────

const roomShots: Shot[] = [
  { t: 0, fx: 540, fy: 770, s: 1.12, ds: 1.05 },
  { t: 0.6, fx: 330, fy: 790, s: 1.38 },
  { t: 1.87, fx: 740, fy: 790, s: 1.38 },
  { t: 2.6, fx: 560, fy: 760, s: 1.15 },
  { t: 3.73, fx: 320, fy: 770, s: 1.45 },
  { t: 4.4, fx: 300, fy: 470, s: 1.5, ds: 1.08 },
  { t: 5.0, fx: 330, fy: 720, s: 1.7 },
  { t: 5.6, fx: 740, fy: 770, s: 1.45 },
  { t: 6.13, fx: 760, fy: 720, s: 1.7 },
  { t: 6.7, fx: 540, fy: 780, s: 1.15, ds: 1.06 },
];
const studyShots: Shot[] = [
  { t: T.story, fx: 560, fy: 700, s: 1.0, ds: 1.05 },
  { t: 7.7, fx: 700, fy: 800, s: 1.9 },
  { t: 8.63, fx: 750, fy: 430, s: 1.7, ds: 1.08 },
];
const hillShots: Shot[] = [
  { t: T.s2, fx: 400, fy: 820, s: 1.12 },
  { t: 10.67, fx: 700, fy: 900, s: 1.7 },
  { t: 11.37, fx: 780, fy: 650, s: 1.6 },
  { t: 11.83, fx: 260, fy: 760, s: 1.7, ds: 1.06 },
];
const digShots: Shot[] = [
  { t: T.s3, fx: 540, fy: 760, s: 1.05 },
  { t: 13.37, fx: 540, fy: 830, s: 1.4 },
  { t: 14.0, fx: 545, fy: 900, s: 1.9, ds: 1.1 },
];

const acts = [
  setRot('#L-armF', -8), setRot('#L-armB', 6), setRot('#D-armF', -6), setRot('#D-armB', 6),
  // Лёша показывает фото
  rot('#L-armF', -78, 0.1, 0.35), rot('#L-armF', -60, 1.87, 0.3), rot('#L-armF', -12, 3.4, 0.35),
  talk('L', 0.05, 1.75), talk('D', 1.9, 3.6), talk('L', 3.75, 5.5), talk('D', 5.62, 7.1),
  // Дима разводит руками, потом указывает
  rot('#D-armF', -40, 1.9, 0.25), rot('#D-armF', -8, 3.3, 0.3), rot('#D-armB', -30, 2.6, 0.25), rot('#D-armB', 6, 3.4, 0.3),
  // Лёша пожимает плечами
  rot('#L-armF', -34, 3.8, 0.25), rot('#L-armB', -34, 3.8, 0.25), rot('#L-armF', -10, 4.9, 0.3), rot('#L-armB', 6, 4.9, 0.3),
  `tl.to('#L-head', { rotation: -8, svgOrigin: '0 50', duration: 0.35 }, 4.4);`, `tl.to('#L-head', { rotation: 0, svgOrigin: '0 50', duration: 0.3 }, 5.4);`,
  rot('#D-armF', -100, 6.13, 0.3, 'back.out(1.6)'),
  `tl.to('#D-head', { rotation: 6, svgOrigin: '0 50', duration: 0.2, yoyo: true, repeat: 1 }, 5.6);`,
  blink('L', [0.9, 3.2, 5.9]), blink('D', [1.4, 4.2, 6.5]),
  `tl.to('.lampG', { opacity: 0.82, duration: 0.11, yoyo: true, repeat: 47, ease: 'sine.inOut' }, 0);`,
  `tl.to('.flame', { scaleY: 1.15, transformOrigin: '50% 100%', duration: 0.13, yoyo: true, repeat: 60 }, 0);`,
  `tl.to('.stoveG', { opacity: 0.7, duration: 0.23, yoyo: true, repeat: 40, ease: 'sine.inOut' }, 0);`,
  `tl.to('.tw0', { opacity: 0.15, duration: 0.6, yoyo: true, repeat: 30 }, 0);`, `tl.to('.tw1', { opacity: 0.2, duration: 0.8, yoyo: true, repeat: 25 }, 0.3);`,
  // вставка: фото деда крупно
  `tl.fromTo('#insert', { opacity: 0, scale: 0.6, rotation: -14 }, { opacity: 1, scale: 1, rotation: -3, duration: 0.3, ease: 'back.out(1.5)' }, 1.15);`,
  `tl.to('#insert', { scale: 1.06, duration: 0.6, ease: 'none' }, 1.45);`,
  // история
  setRot('#S1-armF', -40), setRot('#S1-armB', -30),
  `tl.to('#S1-head', { rotation: 10, svgOrigin: '0 50', duration: 0.4 }, 7.4);`, blink('S1', [8.1, 9.2]),
  `tl.fromTo('.mapRing', { scale: 0.4, opacity: 0, svgOrigin: '236 160' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, 8.63);`,
  setRot('#S2-armF', -60), setRot('#S2-armB', -104),
  rot('#S2-armB', -120, 10.67, 0.3), rot('#S2-armB', -96, 11.37, 0.3), blink('S2', [10.4, 12.1]),
  `tl.to('.sun', { scale: 1.06, transformOrigin: '50% 50%', duration: 0.5, yoyo: true, repeat: 5 }, ${T.s2});`,
  `tl.to('.wave', { x: 30, duration: 1.2, yoyo: true, repeat: 2, ease: 'sine.inOut' }, ${T.s2});`,
  ...[3, 2, 1, 0].map((r, i) => `tl.fromTo('.stone.r${r}', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.04, ease: 'power2.out' }, ${(13.0 + i * 0.25).toFixed(2)});`).reverse(),
  `tl.fromTo('#gold', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.8)' }, 14.0);`,
  `tl.fromTo('#spark', { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: 45, duration: 0.25, yoyo: true, repeat: 3 }, 14.2);`,
  `tl.to('.dust', { y: -80, opacity: 0, duration: 2.6, stagger: 0.05, ease: 'none' }, ${T.s3});`,
  `tl.fromTo('#stamp1', { scale: 2.4, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.18, ease: 'power3.in' }, 14.35);`,
  // инфографика
  `tl.fromTo('#pcard', { opacity: 0, y: 60, rotation: -6, transformOrigin: '320px 220px' }, { opacity: 1, y: 0, rotation: -2, duration: 0.35, ease: 'back.out(1.5)' }, ${T.info});`,
  `tl.fromTo('#ringT', { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 16.3);`,
  `tl.to('#ringT', { scale: 1.12, duration: 0.25, yoyo: true, repeat: 3 }, 16.6);`,
  `tl.to('#ringT', { opacity: 0, duration: 0.2 }, 17.2);`,
  `tl.fromTo('#ringR', { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 17.23);`,
  `tl.to('#ringR', { scale: 1.12, duration: 0.25, yoyo: true, repeat: 3 }, 17.53);`,
  `tl.to('#ringR', { opacity: 0, duration: 0.2 }, ${T.map - 0.05});`,
  `tl.fromTo('#pill1', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25 }, 16.35);`,
  `tl.fromTo('#pill2', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25 }, 17.28);`,
  `tl.to('#pcard', { opacity: 0, scaleX: 0.1, transformOrigin: '320px 220px', duration: 0.18, ease: 'power2.in' }, ${T.map});`,
  `tl.fromTo('#mcard', { opacity: 0, scaleX: 0.1, transformOrigin: '320px 220px' }, { opacity: 1, scaleX: 1, duration: 0.2, ease: 'power2.out', immediateRender: false }, ${T.map + 0.18});`,
  `tl.fromTo('#pin', { y: -120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'bounce.out', immediateRender: false }, 19.13);`,
  `tl.fromTo('#stamp2', { scale: 2.4, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -7, duration: 0.18, ease: 'power3.in' }, 19.6);`,
  `tl.fromTo('#infoCam', { scale: 1 }, { scale: 1.05, transformOrigin: '540px 520px', duration: ${(T.cta - T.info).toFixed(2)}, ease: 'none' }, ${T.info});`,
  // финал
  `tl.fromTo('#houseCam', { scale: 1.12 }, { scale: 1.0, transformOrigin: '540px 800px', duration: ${(T.bio - T.cta).toFixed(2)}, ease: 'power1.out' }, ${T.cta});`,
  `tl.to('.win0, .win1', { opacity: 1, duration: 0.12, stagger: 0.12 }, 23.13);`,
  `tl.to('.winG', { opacity: 1, duration: 0.3 }, 23.2);`,
  `tl.to('.tw2', { opacity: 0.15, duration: 0.5, yoyo: true, repeat: 50 }, 0.1);`,
  // «Бот в био»
  `tl.fromTo('#ctaIcon', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${T.bio});`,
  `tl.fromTo('#ctaText', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, ${T.bio + 0.1});`,
  `tl.to('#ctaIcon', { scale: 1.06, duration: 0.5, yoyo: true, repeat: 2, ease: 'sine.inOut' }, ${T.bio + 0.4});`,
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const sceneDiv = (id: string, t0: number, t1: number, inner: string, extra = '') =>
  `<div class="clip scene" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}" style="background:#000">
        <div class="cam" id="${id}">${svgScene(inner)}</div>${extra}
        <div class="shade10"></div><div class="grain10"></div>
      </div>`;

export const v11: Video6 = {
  id: '11-london',
  title: 'GeoBot: как Колумб — Индию',
  end: END,
  body: `
      <style>
        ${FONTS10}
        .grain10 { position: absolute; inset: 0; pointer-events: none; background: url(grain-dark.png), radial-gradient(90% 70% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%); mix-blend-mode: multiply; opacity: 0.7; }
                .shade10 { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to bottom, rgba(10,8,14,0) 56%, rgba(10,8,14,0.72) 66%, rgba(10,8,14,0.8) 100%); }
        .cap10 { position: absolute; left: 40px; right: 40px; top: 1220px; text-align: center; z-index: 6; }
        .cap10 span { display: inline-block; font-family: 'Oswald'; font-weight: 700; font-size: 92px; line-height: 1.04; letter-spacing: 1px; text-transform: uppercase; color: #fff; text-shadow: 0 4px 0 rgba(0,0,0,0.35), 0 0 24px rgba(0,0,0,0.5); }
        .cap10 i { font-style: normal; } .cap10 .g { color: #8e94a4; } .cap10 .r { color: #ff5a4b; } .cap10 .y { color: #f5c34f; } .cap10 .n { color: #66d684; }
        .tag10 { position: absolute; left: 56px; top: 130px; z-index: 6; background: ${K.paper}; padding: 4px 26px 8px; transform: rotate(-2deg); box-shadow: 0 8px 18px rgba(0,0,0,0.45); color: ${K.ink}; }
        .tag10 b { display: block; font-family: 'Caveat'; font-weight: 700; font-size: 60px; line-height: 1; }
        .tag10 small { display: block; font-size: 17px; font-weight: 700; letter-spacing: 3px; color: #8a7c66; text-transform: uppercase; margin-top: 2px; }
        .who10 { position: absolute; left: 56px; top: 270px; z-index: 6; background: #e8e6e1; border-radius: 10px; padding: 8px 20px 6px; font-family: 'Oswald'; font-weight: 700; font-size: 44px; line-height: 1.05; color: #1d2030; text-transform: uppercase; box-shadow: 0 6px 14px rgba(0,0,0,0.4); }
        .who10 small { display: block; font-family: 'Montserrat'; font-size: 16px; font-weight: 700; letter-spacing: 3px; color: #7c818e; }
        .pill10 { position: absolute; left: 150px; z-index: 6; background: #f1f0ec; color: #1c1f2a; border-radius: 40px; padding: 12px 30px 12px 16px; font-size: 30px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 6px 14px rgba(0,0,0,0.4); opacity: 0; }
        .pill10 b { display: inline-block; width: 46px; height: 46px; line-height: 46px; text-align: center; border-radius: 50%; background: ${K.red}; color: #fff; margin-right: 14px; font-size: 26px; }
        .stamp10 { position: absolute; left: 0; right: 0; text-align: center; z-index: 7; opacity: 0; }
        .stamp10 span { display: inline-block; background: ${K.red}; color: #fff; font-family: 'Oswald'; font-weight: 700; font-size: 88px; letter-spacing: 3px; padding: 2px 36px 6px; border-radius: 10px; box-shadow: 0 0 0 7px #f2ebe0, 0 12px 26px rgba(0,0,0,0.5); text-transform: uppercase; }
        #insert { position: absolute; left: 0; right: 0; top: 380px; height: 0; z-index: 5; opacity: 0; }
        .ctaBox6 { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 200px; }
        #ctaIcon { width: 220px; height: 220px; }
        #ctaText { margin-top: 30px; font-size: 54px; font-weight: 400; color: #fff; }
      </style>
      ${sceneDiv('camRoom', 0, T.story, room, `
        ${tag('Квартира Лизы', '23:10 · Москва')}
        <div id="insert" class="clip" data-start="1.1" data-duration="${(1.87 - 1.1).toFixed(2)}"><svg viewBox="0 0 1080 700" width="1080" height="700" style="position:absolute;left:0;top:0"><g transform="translate(220,90)">${oldPhoto('ins')}</g></svg></div>`)}
      ${who('w1', 'Лиза', '24 года · познакомилась в чате', 0, 1.87)}${who('w2', 'Катя', 'подруга · знает бота', 1.87, 3.73)}${who('w3', 'Лиза', '24 года · познакомилась в чате', 3.73, 5.6)}${who('w4', 'Катя', 'подруга · знает бота', 5.6, T.story)}
      ${sceneDiv('camStudy', T.story, T.s2, study, tag('1492', 'Христофор Колумб'))}
      ${sceneDiv('camHill', T.s2, T.s3, hill, tag('Атлантика', 'август–октябрь 1492'))}
      ${sceneDiv('camDig', T.s3, T.info, dig, `${tag('Багамы', '12 октября 1492')}<div class="stamp10" id="stamp1" style="top:400px"><span>Не Индия</span></div>`)}
      ${sceneDiv('infoCam', T.info, T.cta, infoSvg, `${tag('Спросим у бота', 'фото из чата')}
        <div class="pill10" id="pill1" style="top:960px"><b>1</b>двухэтажный автобус</div>
        <div class="pill10" id="pill2" style="top:1050px"><b>2</b>красная будка</div>
        <div class="stamp10" id="stamp2" style="top:780px"><span>Не Москва</span></div>`)}
      ${sceneDiv('houseCam', T.cta, T.bio, house)}
      ${capHtml}
      <div class="clip scene" data-start="${T.bio}" data-duration="${(END - T.bio).toFixed(2)}" style="background:#000">
        <div class="ctaBox6"><div id="ctaIcon">${ctaIcon(ctaGlyph)}</div><div id="ctaText">Бот в био</div></div>
      </div>`,
  tweens: [
    cam('camRoom', roomShots, T.story), cam('camStudy', studyShots, T.s2), cam('camHill', hillShots, T.s3), cam('camDig', digShots, T.info),
    ...acts, ...capTw,
  ].join('\n      '),
};
