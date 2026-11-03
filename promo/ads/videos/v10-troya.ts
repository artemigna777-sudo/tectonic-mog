/**
 * 10. «Нашёл у деда старое фото: „Наш дом, 1978“» — та же схема, что у роликов 07–09 (диалог → история → «спросим
 * у бота» → «Бот в био»), но в рисовке образца Артёма от 03.11.2026 («Блэкаут»): плоская детальная графика без
 * контуров, дача ночью, бревенчатые стены, луна с ореолом, герой в шапке и парке; подписи — крупные слова Oswald
 * по одному-два, с цветными словами; бумажные бирки рукописным шрифтом, красный штамп.
 * 26,15 с. Музыка — как у ролика 04 (образец «Белоснежка», ~128 BPM): дроп 7,23 с — история, инфографика 15,37 с,
 * вывод 21,67 с, «Бот в био» 24,4 с.
 * История: Генрих Шлиман сверял местность с «Илиадой» и в 1871 году начал раскопки холма Гиссарлык — там нашли Трою,
 * которую многие считали выдумкой.
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

const PHOTO_TOWER: [number, number] = [486, 112];
const PHOTO_BEND: [number, number] = [400, 330];
const oldPhoto = (id: string) => `
  <g id="${id}">
    <rect x="-28" y="-28" width="696" height="560" fill="#efe8d8"/>
    <defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8c39b"/><stop offset="1" stop-color="#c9ad80"/></linearGradient>
      <radialGradient id="${id}-vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#3b2a18" stop-opacity="0"/><stop offset="1" stop-color="#3b2a18" stop-opacity="0.55"/></radialGradient>
      <clipPath id="${id}-clip"><rect width="640" height="440"/></clipPath></defs>
    <g clip-path="url(#${id}-clip)">
      <rect width="640" height="440" fill="url(#${id}-sky)"/>
      <path d="M0,200 Q120,186 240,196 T640,188 V250 H0 Z" fill="#8a7352"/>
      ${forest(31, 0, 640, 206, 46, '#7a6447')}
      <rect x="466" y="150" width="56" height="60" fill="#e6d8b8"/><path d="M466,150 L494,128 L522,150 Z" fill="#9b8564"/>
      <rect x="478" y="96" width="32" height="56" fill="#efe3c6"/><path d="M474,98 L494,26 L514,98 Z" fill="#8f785a"/><path d="M494,26 V8 M486,15 H502" stroke="#6b5640" stroke-width="3"/>
      <rect x="488" y="112" width="8" height="14" fill="#6b5640"/>
      <path d="M0,300 Q180,236 360,268 Q520,298 640,240 V214 Q520,262 380,240 Q190,206 0,250 Z" fill="#eadfc4"/>
      <path d="M60,262 h60 M240,252 h50 M430,262 h70 M540,246 h40" stroke="#c9b48c" stroke-width="3"/>
      <path d="M0,300 Q180,236 360,268 Q520,298 640,240 V440 H0 Z" fill="#a48a62"/>
      <g transform="translate(70,214)">
        <path d="M-10,70 L100,0 L210,70 Z" fill="#6e5a42"/>
        <rect x="0" y="66" width="200" height="120" fill="#8a6f50"/>
        ${[84, 100, 116, 132, 148, 164].map((y) => `<path d="M0,${y} H200" stroke="#6d5640" stroke-width="3"/>`).join('')}
        <rect x="30" y="96" width="44" height="50" fill="#e9dfc6"/><rect x="36" y="102" width="32" height="38" fill="#4d3d2c"/><path d="M52,102 V140 M36,121 H68" stroke="#e9dfc6" stroke-width="3"/>
        <rect x="126" y="96" width="44" height="50" fill="#e9dfc6"/><rect x="132" y="102" width="32" height="38" fill="#4d3d2c"/><path d="M148,102 V140 M132,121 H164" stroke="#e9dfc6" stroke-width="3"/>
        <path d="M24,92 L52,82 L80,92 M120,92 L148,82 L176,92" stroke="#e9dfc6" stroke-width="5" fill="none"/>
        <circle cx="100" cy="44" r="12" fill="#e9dfc6"/><rect x="146" y="-4" width="16" height="40" fill="#5b4a36"/>
      </g>
      <g fill="#5d4a35">${Array.from({ length: 16 }, (_, i) => `<rect x="${20 + i * 22}" y="384" width="10" height="44" rx="2"/>`).join('')}<rect x="10" y="396" width="360" height="6"/></g>
      <rect x="352" y="250" width="9" height="170" fill="#eee4cc"/><path d="M352,280 h9 M352,320 h9 M352,360 h9" stroke="#4d3d2c" stroke-width="3"/>
      <circle cx="356" cy="236" r="44" fill="#7d6a4a"/><circle cx="330" cy="256" r="30" fill="#8a7654"/>
      <rect width="640" height="440" fill="url(#${id}-vig)"/>
      <path d="M120,0 L132,440 M520,0 L506,180 M0,120 Q300,140 640,110" stroke="#fff8e8" stroke-width="1.5" opacity="0.35"/>
    </g>
    <text x="320" y="508" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="44" fill="#2b2622">Наш дом, 1978</text>
  </g>`;

// ─── Сцена 1: дача ночью, комната деда ───────────────────────────────────────

const FLOOR = 1060;
const FEET = 1150;
const LESHA: Pal = { coat: '#4f6b3e', coat2: '#3d5530', pants: '#2a2f3c', pants2: '#222631', hat: '#2f3340', hat2: '#3a3f4e' };
const DIMA: Pal = { coat: '#b0653a', coat2: '#8f4f2c', pants: '#2f3446', pants2: '#262a39', hair: '#4a3022' };
const photoProp = `<g transform="translate(14,${ARM + 2}) rotate(-90) scale(0.16)"><rect x="-28" y="-28" width="696" height="560" fill="#efe8d8"/><rect width="640" height="440" fill="#b49a70"/><rect x="70" y="280" width="200" height="120" fill="#8a6f50"/><path d="M60,284 L170,214 L280,284 Z" fill="#6e5a42"/></g>`;

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
    <text x="670" y="364" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="30" fill="#fff">1978</text>
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
    <rect x="928" y="-400" width="30" height="${400 + 930}" fill="#25262c"/><rect x="922" y="420" width="42" height="14" fill="#1b1c21"/>
    <circle cx="944" cy="1060" r="230" fill="url(#stoveGlow)" class="stoveG"/>
    <rect x="860" y="910" width="170" height="${FEET - 910 - 20}" rx="14" fill="#2c2e35"/>
    <rect x="860" y="910" width="170" height="20" rx="8" fill="#3a3c45"/>
    <rect x="890" y="960" width="110" height="80" rx="8" fill="#1b1c21"/><rect class="stoveG" x="900" y="1000" width="90" height="28" rx="6" fill="#ff8a3a"/>
    <rect x="876" y="${FEET - 30}" width="20" height="30" fill="#1b1c21"/><rect x="994" y="${FEET - 30}" width="20" height="30" fill="#1b1c21"/>
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
  ${person({ id: 'L', x: 300, y: FEET, s: 0.98, c: LESHA, head: 'beanie', prop: photoProp })}
  ${person({ id: 'D', x: 760, y: FEET, s: 0.98, dir: -1, c: DIMA, head: 'hair', body: 'sweater' })}
  <rect x="-600" y="-400" width="2300" height="2700" fill="#0a0d18" opacity="0.18"/>`;

// ─── История: Шлиман и Троя ──────────────────────────────────────────────────

const SCHLI: Pal = { coat: '#4a4038', coat2: '#3a322c', pants: '#2c2a2e', pants2: '#242226', hat: '#2e2a26', hat2: '#3d3731', beard: '#cfc8bc' };
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
    <text x="250" y="240" font-family="Caveat" font-weight="700" font-size="34" fill="#4a3a2a">Троя?</text>
    <circle cx="190" cy="-6" r="7" fill="#7a2f2a"/>
  </g>
  <rect x="-600" y="1060" width="2300" height="1400" fill="#1a1716"/><rect x="-600" y="1060" width="2300" height="10" fill="#121010"/>
  <rect x="520" y="900" width="420" height="22" fill="#5a3e2c"/><rect x="540" y="922" width="20" height="230" fill="#3f2b20"/><rect x="900" y="922" width="20" height="230" fill="#3f2b20"/>
  <path d="M600,898 L700,880 L800,898 L800,904 L600,904 Z" fill="#e9dfc6"/><path d="M700,880 V902" stroke="#b9a882" stroke-width="3"/>
  ${[0, 1, 2, 3].map((i) => `<path d="M${616 + i * 6},${890 - i} H${684}" stroke="#b9a882" stroke-width="2"/><path d="M${716},${890 - i} H${784 - i * 6}" stroke="#b9a882" stroke-width="2"/>`).join('')}
  <text x="650" y="870" font-family="Caveat" font-weight="700" font-size="36" fill="#e9dfc6" class="iliad">Илиада</text>
  <rect x="846" y="880" width="30" height="20" rx="5" fill="#3a3c45"/><rect x="852" y="820" width="18" height="60" rx="8" fill="#f4e6c4" opacity="0.55"/><path class="flame" d="M861,862 Q853,848 861,834 Q869,848 861,862 Z" fill="#ffb347"/>
  <circle class="lampG" cx="861" cy="850" r="400" fill="url(#lampGlow10)"/>
  ${person({ id: 'S1', x: 420, y: 1150, s: 0.98, c: SCHLI, head: 'brim', body: 'coat' })}
  <rect x="-600" y="-400" width="2300" height="2700" fill="#0a0d18" opacity="0.15"/>`;

const hill = `
  <defs><linearGradient id="dusk10" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2440"/><stop offset="0.55" stop-color="#5c3e56"/><stop offset="1" stop-color="#8a5a5c"/></linearGradient></defs>
  <rect x="-600" y="-400" width="2300" height="1400" fill="url(#dusk10)"/>
  <circle cx="760" cy="440" r="210" fill="#f2b45e" opacity="0.12"/><circle cx="760" cy="440" r="130" fill="#f2b45e" opacity="0.18"/><circle class="sun" cx="760" cy="440" r="72" fill="#f2b45e"/>
  <rect x="-600" y="660" width="2300" height="70" fill="#5f6f92"/>
  <path d="M-600,664 H1700" stroke="#b9a6b8" stroke-width="3" opacity="0.6"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<path class="wave" d="M${-200 + i * 240},${690 + (i % 2) * 18} h70" stroke="#a7b3cf" stroke-width="4" opacity="0.6"/>`).join('')}
  <path d="M-600,730 Q-200,690 200,720 Q600,700 1000,724 Q1300,700 1700,720 V1400 H-600 Z" fill="#4a3a48"/>
  <path d="M520,760 Q660,640 820,640 Q960,650 1060,760 Z" fill="#5a4652"/>
  <g transform="translate(790,640)"><path d="M-60,0 L-60,-26 L-30,-26 L-30,-12 L0,-12 L0,-34 L30,-34 L30,-12 L60,-12 L60,0 Z" fill="#7a6470" opacity="0.8"/></g>
  <path d="M-600,860 Q-100,820 300,860 Q700,820 1100,858 Q1400,830 1700,850 V1400 H-600 Z" fill="#3a2e3a"/>
  <path d="M1100,760 Q900,800 800,860 Q680,930 560,960 Q400,1000 300,1100" stroke="#8aa0c4" stroke-width="34" fill="none" stroke-linecap="round"/>
  <path d="M1100,760 Q900,800 800,860 Q680,930 560,960 Q400,1000 300,1100" stroke="#b2c2dc" stroke-width="6" fill="none" stroke-dasharray="20 40" opacity="0.6"/>
  <path d="M-600,1020 Q-100,960 300,990 Q500,1000 600,1060 Q700,1120 1700,1120 V1500 H-600 Z" fill="#2a2230"/>
  ${forest(21, -600, 1700, 1080, 50, '#221b28')}
  <rect x="-600" y="1150" width="2300" height="1300" fill="#1c1722"/>
  ${person({ id: 'S2', x: 230, y: 1150, s: 0.98, c: SCHLI, head: 'brim', body: 'coat', prop: bookProp })}
  <g class="chk" id="chkR"><path d="M560,960 L560,1000" stroke="#fff" stroke-width="0"/></g>`;

const STONE = '#8b8698';
const dig = `
  <defs><linearGradient id="dusk11" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2440"/><stop offset="1" stop-color="#7a5060"/></linearGradient></defs>
  <rect x="-600" y="-400" width="2300" height="1000" fill="url(#dusk11)"/>
  <circle cx="300" cy="300" r="60" fill="#f2b45e" opacity="0.9"/><circle cx="300" cy="300" r="120" fill="#f2b45e" opacity="0.12"/>
  <path d="M-600,560 Q0,520 540,540 Q1000,520 1700,560 V2400 H-600 Z" fill="#6a4a3a"/>
  <rect x="-600" y="640" width="2300" height="110" fill="#5d4032"/><rect x="-600" y="750" width="2300" height="140" fill="#4f372b"/><rect x="-600" y="890" width="2300" height="170" fill="#432e25"/><rect x="-600" y="1060" width="2300" height="1400" fill="#2a1f1b"/>
  ${Array.from({ length: 30 }, (_, i) => { const r = rng(40 + i); return `<circle cx="${(-500 + r() * 2100).toFixed(0)}" cy="${(660 + r() * 380).toFixed(0)}" r="${(4 + r() * 8).toFixed(0)}" fill="#2f211a" opacity="0.5"/>`; }).join('')}
  <path d="M180,600 L240,1060 H840 L900,600 Z" fill="#3a2a24"/><path d="M180,600 L240,1060 H300 L250,600 Z" fill="#2c201b"/><path d="M900,600 L840,1060 H790 L840,600 Z" fill="#45332b"/>
  <path d="M160,598 H920" stroke="#d9c6a0" stroke-width="3" stroke-dasharray="14 10"/>${[260, 400, 540, 680, 820].map((x) => `<rect x="${x - 4}" y="566" width="8" height="40" fill="#8a6a4a"/>`).join('')}
  <g transform="translate(790,600) rotate(14)"><rect x="0" y="0" width="10" height="440" fill="#8a6a4a"/><rect x="56" y="0" width="10" height="440" fill="#8a6a4a"/>${[40, 100, 160, 220, 280, 340, 400].map((y) => `<rect x="0" y="${y}" width="66" height="9" fill="#9a7a56"/>`).join('')}</g>
  <g transform="translate(-60,560)"><path d="M0,0 H120 L100,40 H20 Z" fill="#5a5a66"/><circle cx="40" cy="52" r="16" fill="#2a2a30"/><path d="M110,10 L170,40" stroke="#6a4a36" stroke-width="8"/><ellipse cx="60" cy="-4" rx="56" ry="14" fill="#6a4a3a"/></g>
  <g id="walls">
    ${Array.from({ length: 4 }, (_, row) => Array.from({ length: 6 }, (_, col) => `<rect class="stone r${row}" x="${266 + col * 92 + (row % 2) * 46}" y="${960 - row * 64}" width="86" height="58" rx="6" fill="${row % 2 ? STONE : '#7a7586'}"/>`).join('')).join('')}
    <rect class="stone r3" x="420" y="700" width="70" height="66" fill="#6a6576"/><rect class="stone r3" x="590" y="700" width="70" height="66" fill="#6a6576"/><path class="stone r3" d="M266,766 H820" stroke="#5a5566" stroke-width="6"/>
  </g>
  <g transform="translate(540,1010)"><g id="gold"><path d="M-70,0 Q0,-30 70,0 L60,14 Q0,-12 -60,14 Z" fill="#f2c14e"/>${[-48, -24, 0, 24, 48].map((x) => `<rect x="${x - 4}" y="2" width="8" height="${30 - Math.abs(x) / 3}" fill="#e5ad38"/>`).join('')}</g></g>
  <g transform="translate(600,985)"><g id="spark" opacity="0"><path d="M0,-40 L8,-8 L40,0 L8,8 L0,40 L-8,8 L-40,0 L-8,-8 Z" fill="#fff6d0"/></g></g>
  <g fill="#1a1416">
    <g transform="translate(110,600)"><rect x="-14" y="-90" width="28" height="70" rx="10"/><circle cy="-108" r="18"/><rect x="-12" y="-20" width="10" height="20"/><rect x="2" y="-20" width="10" height="20"/><path d="M14,-80 L60,-10" stroke="#1a1416" stroke-width="6"/><rect x="52" y="-14" width="22" height="16" transform="rotate(30 63 -6)"/></g>
    <g transform="translate(980,600) scale(-1,1)"><rect x="-14" y="-90" width="28" height="70" rx="10"/><circle cy="-108" r="18"/><rect x="-12" y="-20" width="10" height="20"/><rect x="2" y="-20" width="10" height="20"/><path d="M14,-70 L50,-110" stroke="#1a1416" stroke-width="6"/></g>
  </g>
  <rect x="-600" y="1150" width="2300" height="1300" fill="#1f1714"/>
  ${Array.from({ length: 18 }, (_, i) => { const r = rng(70 + i); return `<circle class="dust" cx="${(220 + r() * 640).toFixed(0)}" cy="${(700 + r() * 380).toFixed(0)}" r="${(3 + r() * 5).toFixed(0)}" fill="#d9b48a" opacity="0.35"/>`; }).join('')}`;

// ─── Инфографика: фото → карта ───────────────────────────────────────────────

const mapCard = `
  <g id="map">
    <rect x="-28" y="-28" width="696" height="560" fill="#efe8d8"/>
    <rect width="640" height="440" fill="#34452f"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${30 + (i % 3) * 200 + (i % 2) * 20}" y="${40 + Math.floor(i / 3) * 130}" width="${120 + (i % 4) * 14}" height="${70 + (i % 3) * 10}" fill="${['#3f5236', '#475a3b', '#3a4c32'][i % 3]}"/>`).join('')}
    ${Array.from({ length: 16 }, (_, i) => { const r = rng(90 + i); return `<circle cx="${(r() * 640).toFixed(0)}" cy="${(r() * 440).toFixed(0)}" r="${(16 + r() * 22).toFixed(0)}" fill="#26341f"/>`; }).join('')}
    <path d="M0,330 Q160,250 320,290 Q470,330 640,200" stroke="#5a7fa8" stroke-width="30" fill="none"/>
    <path d="M0,330 Q160,250 320,290 Q470,330 640,200" stroke="#7fa2c8" stroke-width="6" fill="none" opacity="0.6"/>
    <path d="M60,0 Q120,180 150,440 M150,300 H640" stroke="#b9a77e" stroke-width="7" fill="none"/>
    <g fill="#c9b48c">${[[130, 210], [168, 196], [110, 240], [180, 236], [200, 206]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="16"/>`).join('')}</g>
    <g transform="translate(500,190)"><rect x="-10" y="-10" width="20" height="20" fill="#efe3c6"/><path d="M0,-34 V-10 M-8,-26 H8" stroke="#efe3c6" stroke-width="4"/></g>
    <g transform="translate(168,196)"><g id="pin"><path d="M0,0 C-26,-30 -30,-44 -30,-54 A30,30 0 1 1 30,-54 C30,-44 26,-30 0,0 Z" fill="#ff8a2a"/><circle cy="-54" r="11" fill="#1a1e2d"/></g></g>
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
  <rect x="-600" y="-400" width="2300" height="2700" fill="${K.night}"/>
  <rect x="-600" y="600" width="2300" height="500" fill="${K.night2}" opacity="0.5"/>
  ${stars(77, 50, 0, 1080, 60, 700)}${moon(820, 260, 40)}
  ${forest(5, -600, 1700, 930, 160, K.forest)}
  <g transform="translate(540,1040)">
    <rect x="70" y="-420" width="44" height="120" fill="#4a3427"/>
    <path d="M-290,-250 L0,-460 L290,-250 Z" fill="#3b3742"/><path d="M-310,-246 L0,-476 L310,-246" stroke="${K.trim}" stroke-width="14" fill="none"/>
    <path d="M-250,-250 L0,-430 L250,-250 Z" fill="#6a4a36"/>
    <circle cx="0" cy="-320" r="34" fill="${K.trim}"/><circle cx="0" cy="-320" r="24" fill="#2a2f45"/><path d="M0,-344 V-296 M-24,-320 H24" stroke="${K.trim}" stroke-width="5"/>
    <rect x="-260" y="-250" width="520" height="250" fill="#6a4a36"/>
    ${[-220, -190, -160, -130, -100, -70, -40].map((y) => `<path d="M-260,${y} H260" stroke="#5a3e2d" stroke-width="5"/>`).join('')}
    <rect x="-260" y="-256" width="520" height="16" fill="${K.trim}"/>
    ${[-170, 170].map((x, i) => `<g transform="translate(${x},-130)">
      <path d="M-62,-82 L0,-108 L62,-82 Z" fill="${K.trim}"/><rect x="-58" y="-80" width="116" height="120" fill="${K.trim}"/>
      <rect x="-46" y="-68" width="92" height="96" fill="#232a40"/><rect class="win${i}" x="-46" y="-68" width="92" height="96" fill="#f6c76a" opacity="0"/>
      <path d="M0,-68 V28 M-46,-20 H46" stroke="${K.trim}" stroke-width="7"/><rect x="-66" y="38" width="132" height="12" fill="${K.trim}"/></g>`).join('')}
    <circle class="winG" cx="0" cy="-150" r="460" fill="url(#winGlow)" opacity="0"/>
    <rect x="-44" y="-180" width="88" height="180" fill="#4a3226"/><rect x="-50" y="-186" width="100" height="10" fill="${K.trim}"/><circle cx="26" cy="-90" r="6" fill="#d9c6a0"/>
  </g>
  <defs><radialGradient id="winGlow"><stop offset="0" stop-color="#f6c76a" stop-opacity="0.35"/><stop offset="1" stop-color="#f6c76a" stop-opacity="0"/></radialGradient></defs>
  <g transform="translate(920,1040)"><rect x="-8" y="-380" width="16" height="380" fill="#e9e4da"/>${[-320, -260, -180, -100].map((y) => `<rect x="-8" y="${y}" width="16" height="6" fill="#2a2a2a"/>`).join('')}<path d="M0,-300 L60,-360 M0,-220 L-50,-280" stroke="#e9e4da" stroke-width="5"/></g>
  <rect x="-600" y="1040" width="2300" height="1400" fill="#1f1d2a"/>
  <g fill="#5a4535">${Array.from({ length: 50 }, (_, i) => `<path d="M${-260 + i * 34},1150 V1060 l10,-14 l10,14 V1150 Z"/>`).join('')}<rect x="-300" y="1080" width="1800" height="10"/><rect x="-300" y="1120" width="1800" height="10"/></g>
  <rect x="-600" y="1150" width="2300" height="1300" fill="#191723"/>`;

// ─── Подписи ─────────────────────────────────────────────────────────────────

interface Cap { t: number; html: string; top?: number }
const caps: Cap[] = [
  { t: 0, html: 'Нашёл у деда' }, { t: 0.6, html: '<i class="y">старое фото:</i>' }, { t: 1.2, html: '«Наш дом, 1978»' },
  { t: 1.87, html: 'И где это?' }, { t: 2.6, html: '<i class="g">Какая</i> деревня?' },
  { t: 3.73, html: 'Дед <i class="g">не помнит.</i>' }, { t: 4.4, html: 'А деревни' }, { t: 5.0, html: '<i class="r">нет на картах.</i>' },
  { t: 5.6, html: 'Найдём.' }, { t: 6.13, html: 'Как Шлиман —' }, { t: 6.7, html: '<i class="y">Трою.</i>' },
  { t: T.story, html: 'Трою' }, { t: 7.7, html: 'все считали' }, { t: 8.63, html: '<i class="g">выдумкой.</i>' },
  { t: T.s2, html: 'Шлиман сверил' }, { t: 10.67, html: '<i class="y">реки, холмы</i>' }, { t: 11.37, html: 'и море' }, { t: 11.83, html: 'с поэмой Гомера —' },
  { t: T.s3, html: 'копнул' }, { t: 13.37, html: 'и нашёл' }, { t: 14.0, html: '<i class="y">город.</i>' },
  { t: T.info, html: 'Бот заметил' }, { t: 16.3, html: '<i class="y">колокольню,</i>' }, { t: 17.23, html: '<i class="y">изгиб реки</i>' },
  { t: T.map, html: 'и нашёл' }, { t: 19.13, html: '<i class="n">дом деда.</i>' }, { t: 20.3, html: 'За 10 секунд.' },
  { t: T.cta, html: 'Фото помнит' }, { t: 22.4, html: 'то, что люди' }, { t: 23.13, html: '<i class="r">забыли.</i>' },
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

export const v10: Video6 = {
  id: '10-troya',
  title: 'GeoBot: как Шлиман — Трою',
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
        ${tag('Дача деда', '23:40 · Тверская обл.')}
        <div id="insert" class="clip" data-start="1.1" data-duration="${(1.87 - 1.1).toFixed(2)}"><svg viewBox="0 0 1080 700" width="1080" height="700" style="position:absolute;left:0;top:0"><g transform="translate(220,90)">${oldPhoto('ins')}</g></svg></div>`)}
      ${who('w1', 'Лёша', '26 лет · внук', 0, 1.87)}${who('w2', 'Дима', 'друг · знает бота', 1.87, 3.73)}${who('w3', 'Лёша', '26 лет · внук', 3.73, 5.6)}${who('w4', 'Дима', 'друг · знает бота', 5.6, T.story)}
      ${sceneDiv('camStudy', T.story, T.s2, study, tag('1868', 'Генрих Шлиман'))}
      ${sceneDiv('camHill', T.s2, T.s3, hill, tag('Холм Гиссарлык', 'Турция · 1871'))}
      ${sceneDiv('camDig', T.s3, T.info, dig, `${tag('Раскопки', '1871–1873')}<div class="stamp10" id="stamp1" style="top:400px"><span>Троя</span></div>`)}
      ${sceneDiv('infoCam', T.info, T.cta, infoSvg, `${tag('Спросим у бота', 'фото деда · 1978')}
        <div class="pill10" id="pill1" style="top:960px"><b>1</b>шатровая колокольня</div>
        <div class="pill10" id="pill2" style="top:1050px"><b>2</b>изгиб реки</div>
        <div class="stamp10" id="stamp2" style="top:780px"><span>Дом найден</span></div>`)}
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
