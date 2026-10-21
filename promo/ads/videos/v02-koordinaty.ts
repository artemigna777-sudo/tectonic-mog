/**
 * 02. «Смотри, какое место. Хочу туда» — первый «живой» ролик GeoBot по образцам IQuit (`engine6.ts`).
 * Ночь, двое на диване. Красивое фото без подписи, автор удалил аккаунт; координат в фото нет —
 * Telegram их стирает (инфографика). «Скинь боту» — в телефоне бот находит место: Старое Чурилино,
 * Татарстан (настоящий случай). В субботу герои уже там и фотографируют ту же церковь.
 * Факт: Telegram сжимает обычные фото и удаляет из них метаданные EXIF, в том числе GPS; файлом фото
 * уходит без изменений (так это и устроено в боте: «Отправьте файлом — там часто есть GPS»).
 */
import {
  C6, FOREGROUND, POSE, blinks, captions, ctaIcon, face, figure, nod, pose, screen, shotTweens, svg6, tilt, wave,
  type Line6, type Shot, type Video6,
} from '../engine6.ts';

// Склейки конца — по музыке образцов (112 BPM): затишье 30,25 с, удар дропа 34,03 с, акцент 37,27 с, конец 41,4 с.
const END = 41.4;
const T = { info: [13.6, 15.9, 18.6], phone: [21.4, 26.0], night: 30.25, day: 34.03, swell: 34.55, shot: 35.67, cta: 37.27 };

// ─── Комната ──────────────────────────────────────────────────────────────────

const FLOOR = 1350;
const A = figure({ id: 'A', x: 380, pose: 'sit', floor: FLOOR, hair: 'spiky', face: 'smile', phone: 'R', phoneRot: -138 });
const B = figure({ id: 'B', x: 720, pose: 'sit', floor: FLOOR, hair: 'long', face: 'neutral' });

const skyline = (() => {
  let lit = '';
  const bld: [number, number, number][] = [[100, 70, 640], [175, 60, 600], [240, 80, 680], [325, 55, 620], [385, 85, 660]];
  let body = '';
  bld.forEach(([x, w, top], i) => {
    body += `<rect x="${x}" y="${top}" width="${w}" height="${860 - top}" fill="#05080d" stroke="none"/>`;
    for (let y = top + 18; y < 840; y += 30)
      for (let xx = x + 10; xx < x + w - 10; xx += 20)
        if ((xx * 7 + y * 3 + i * 11) % 5 === 0) lit += `<rect x="${xx}" y="${y}" width="8" height="12" fill="#d9b56a" stroke="none" opacity="0.7"/>`;
  });
  return body + lit;
})();

const room = `
  <rect x="-400" y="-400" width="1880" height="${FLOOR + 400}" fill="url(#wall)" stroke="none"/>
  <rect x="-400" y="${FLOOR}" width="1880" height="700" fill="#090c11" stroke="none"/>
  <g stroke="#3d434e" stroke-width="4">
    <path d="M-400,${FLOOR} H1480"/>
    <rect x="90" y="420" width="380" height="440" fill="#0a1220"/>
  </g>
  <g>${skyline}</g>
  <circle cx="400" cy="500" r="26" fill="#d8dde6" stroke="none" opacity="0.8"/><circle cx="412" cy="492" r="24" fill="#0a1220" stroke="none"/>
  <g stroke="#3d434e" stroke-width="5" fill="none"><rect x="90" y="420" width="380" height="440"/><path d="M280,420 V860 M90,640 H470"/></g>
  <g stroke="#3d434e" stroke-width="4">
    <rect x="610" y="520" width="250" height="180" fill="#0e1218"/>
    <path d="M630,650 l40,-50 l30,30 l40,-60 l60,80" stroke="#59606c" stroke-width="3"/>
    <path d="M650,580 q40,40 90,10 q40,-30 90,20" stroke="#59606c" stroke-width="2" stroke-dasharray="6 8"/>
    <path d="M820,606 c-10,-12 -12,-22 0,-30 c12,8 10,18 0,30 z" fill="${C6.accent}" stroke="none"/>
  </g>
  <circle id="lampGlow" cx="985" cy="830" r="300" fill="url(#lampGlow)" stroke="none"/>
  <g stroke="#4a515d" stroke-width="4">
    <path d="M985,${FLOOR} V830 M945,${FLOOR} h80"/>
    <path d="M925,830 L950,750 H1020 L1045,830 Z" fill="#1d222b"/>
  </g>
  <ellipse cx="540" cy="${FLOOR + 90}" rx="460" ry="60" fill="#0d1117" stroke="#262b33" stroke-width="3"/>
  <g stroke="#4a515d" stroke-width="4">
    <rect x="200" y="1030" width="700" height="170" rx="30" fill="#151a22"/>
    <rect x="160" y="1090" width="80" height="180" rx="24" fill="#12161d"/>
    <rect x="860" y="1090" width="80" height="180" rx="24" fill="#12161d"/>
    <rect x="230" y="1172" width="640" height="98" rx="16" fill="#11151c"/>
    <path d="M550,1180 V1262 M240,1270 v40 M860,1270 v40"/>
    <rect x="40" y="1190" width="100" height="160" fill="#0f1319"/>
    <path d="M70,1190 v-34 h40 v34 M110,1166 q16,0 16,12 q0,12 -16,10"/>
  </g>
  ${A.svg}${B.svg}`;

// ─── Утро субботы: церковь на холме ──────────────────────────────────────────

const church = (x: number, y: number, k = 1, stroke = '#f4f4f2') => `<g transform="translate(${x} ${y}) scale(${k})" stroke="${stroke}">
    <path d="M-80,0 V-150 H80 V0 Z M-80,-150 L0,-200 L80,-150" fill="#0e1520"/>
    <path d="M-28,-200 V-262 H28 V-200" fill="#0e1520"/>
    <path d="M-34,-262 C-40,-300 -10,-318 0,-342 C10,-318 40,-300 34,-262 Z" fill="#0e1520"/>
    <path d="M0,-342 V-392 M-14,-376 H14 M-10,-360 l20,-8"/>
    <path d="M-30,0 V-70 Q0,-96 30,-70 V0 M-60,-110 v-24 M60,-110 v-24"/>
    <path d="M110,0 V-210 H160 V0 Z M110,-210 L135,-250 L160,-210 M135,-250 v-30 M127,-268 h16" fill="#0e1520"/>
  </g>`;

const A2 = figure({ id: 'A2', x: 330, pose: 'stand', floor: 1560, hair: 'spiky', face: 'happy', phone: 'R', phoneRot: -138 });
const B2 = figure({ id: 'B2', x: 560, pose: 'stand', floor: 1560, hair: 'long', face: 'smile' });

const day = `
  <rect x="-400" y="-400" width="1880" height="2800" fill="url(#dawn)" stroke="none"/>
  <circle cx="900" cy="1010" r="360" fill="url(#sunGlow)" stroke="none"/>
  <circle cx="900" cy="1010" r="60" fill="#ffcf9a" stroke="none" opacity="0.9"/>
  <path d="M-400,1120 C-100,1060 200,1020 520,1000 C760,990 1000,1060 1480,1100 V2400 H-400 Z" fill="#0d1520" stroke="#cfd5de" stroke-width="4"/>
  ${church(640, 1010, 0.9)}
  <path d="M-400,1250 H1480" stroke="#cfd5de" stroke-width="3"/>
  <rect x="-400" y="1250" width="1880" height="1300" fill="#0b1119" stroke="none"/>
  <g stroke="#7f8a99" stroke-width="3">${Array.from({ length: 8 }, (_, i) => `<path d="M${-300 + ((i * 230) % 1600)},${1290 + i * 22} q40,-10 80,0 q40,10 80,0"/>`).join('')}</g>
  <path d="M-400,1480 C0,1440 600,1450 1480,1500 V2400 H-400 Z" fill="#0d141d" stroke="#cfd5de" stroke-width="4"/>
  ${A2.svg}${B2.svg}`;

// ─── Инфографика ──────────────────────────────────────────────────────────────

const photoIcon = `<rect x="-60" y="-46" width="120" height="92" rx="10"/><path d="M-48,30 l30,-34 l22,22 l18,-20 l30,32"/><circle cx="26" cy="-20" r="10"/>`;
const fileIcon = `<path d="M-42,-56 H20 L46,-30 V56 H-42 Z M20,-56 V-30 H46"/><path d="M-24,0 h48 M-24,20 h48 M-24,40 h30"/>`;
const ico = (x: number, y: number, body: string, color = '#fff', w = 6) =>
  `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const clue = {
  sign: `<rect x="-52" y="-36" width="104" height="56" rx="6"/><path d="M-34,-16 h68 M-34,2 h44 M-30,20 V52 M30,20 V52"/>`,
  plate: `<rect x="-62" y="-26" width="124" height="52" rx="8"/><text x="-16" y="12" font-size="30" font-weight="800" fill="#fff" stroke="none" text-anchor="middle" font-family="Montserrat">А12</text><path d="M30,-26 V26"/><text x="46" y="2" font-size="18" font-weight="800" fill="#fff" stroke="none" text-anchor="middle" font-family="Montserrat">16</text>`,
  road: `<path d="M0,-50 L52,40 H-52 Z"/><path d="M0,-14 V14 M0,26 v2"/>`,
  pole: `<path d="M0,-56 V56 M-40,-40 H40 M-30,-40 v12 M30,-40 v12 M-60,-30 Q0,-10 60,-30"/>`,
  tree: `<path d="M0,56 V-56 M0,-20 l-24,-18 M0,0 l26,-20 M0,20 l-20,-14 M-6,-44 h4 M-4,-30 h8 M-6,6 h6 M-4,34 h6"/>`,
};
const clueRow = Object.entries(clue)
  .map(([k, body], i) => {
    const x = 140 + i * 200;
    const label = { sign: 'вывески', plate: 'номера', road: 'знаки', pole: 'столбы', tree: 'деревья' }[k];
    return `<g id="clue${i}" opacity="0">${ico(x, 1430, body, C6.accent, 5)}<text x="${x}" y="1530" font-size="26" font-weight="600" fill="#cfd3da" text-anchor="middle" font-family="Montserrat">${label}</text></g>`;
  })
  .join('');

const info = `<div class="over" id="info" style="background: rgba(5,7,10,0.84)">
    <div class="ih" id="ih1" style="top: 560px">КООРДИНАТЫ В ФОТО<br><span class="acc">ПОСЛЕ ОТПРАВКИ В TELEGRAM</span></div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      <g id="row1" opacity="0">${ico(260, 800, photoIcon)}<text x="260" y="900" font-size="28" fill="#cfd3da" text-anchor="middle" font-family="Montserrat" font-weight="600">фото</text>
        ${ico(540, 800, '<path d="M-60,0 H50 M30,-20 L56,0 L30,20"/>', '#8b919c', 5)}
        <text x="800" y="822" font-size="64" font-weight="800" fill="${C6.accent}" text-anchor="middle" font-family="Montserrat">GPS ✕</text></g>
      <g id="row2" opacity="0">${ico(260, 1030, fileIcon)}<text x="260" y="1130" font-size="28" fill="#cfd3da" text-anchor="middle" font-family="Montserrat" font-weight="600">файлом</text>
        ${ico(540, 1030, '<path d="M-60,0 H50 M30,-20 L56,0 L30,20"/>', '#8b919c', 5)}
        <text x="800" y="1052" font-size="64" font-weight="800" fill="#fff" text-anchor="middle" font-family="Montserrat">GPS ✓</text></g>
      ${clueRow}
    </svg>
    <div class="ih" id="ih2" style="top: 1250px; opacity: 0">А БЕЗ GPS ПОДСКАЗКИ — <span class="acc">В КАДРЕ</span></div>
    <div class="src6">Telegram сжимает обычные фото и удаляет из них метаданные (EXIF), в том числе GPS.<br>Отправленное файлом фото не меняется.</div>
  </div>`;

// ─── Телефон крупно: чат с ботом ─────────────────────────────────────────────

const hand = (x: number, y: number, f: 1 | -1) => `<g transform="translate(${x} ${y}) scale(${f} 1)" stroke="#f4f4f2" stroke-width="7" fill="#000">
    <path d="M-120,260 C-110,160 -70,60 -10,10 C20,-14 40,0 36,30 L30,80"/>
    <path d="M30,-60 q40,-6 40,20 q0,24 -40,22 M30,10 q44,-6 44,22 q0,26 -44,22 M30,80 q40,-4 40,22 q0,24 -40,20"/>
  </g>`;
const phoneUI = `<div class="over" id="phoneUI" style="background: rgba(5,7,10,0.86)">
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">
      <g id="phoneBody">
        <rect x="250" y="620" width="580" height="1120" rx="74" fill="#0b0e13" stroke="#f4f4f2" stroke-width="8"/>
        <rect x="282" y="680" width="516" height="1000" rx="44" fill="#10141b"/>
        <rect x="490" y="642" width="100" height="18" rx="9" fill="#000"/>
        <circle cx="336" cy="736" r="26" fill="#1f2630" stroke="${C6.accent}" stroke-width="4"/>
        <path d="M336,752 c-10,-12 -12,-22 0,-30 c12,8 10,18 0,30 z" fill="${C6.accent}"/>
        <text x="378" y="732" font-size="28" font-weight="700" fill="#fff" font-family="Montserrat">GeoSleuth</text>
        <text x="378" y="764" font-size="20" fill="#7d838e" font-family="Montserrat">бот</text>
        <path d="M282,790 H798" stroke="#232a34" stroke-width="2"/>
        <g id="msgPhoto" opacity="0">
          <rect x="470" y="820" width="300" height="300" rx="22" fill="#1d3b5c"/>
          <rect x="486" y="836" width="268" height="268" rx="14" fill="#0e1520"/>
          <path d="M486,1060 C560,1030 640,1020 754,1040" stroke="#cfd5de" stroke-width="3" fill="none"/>
          ${church(600, 1046, 0.5)}
        </g>
        <g id="msgTyping" opacity="0">
          <rect x="310" y="1150" width="130" height="64" rx="30" fill="#232a34"/>
          <circle class="dot" cx="346" cy="1182" r="8" fill="#9aa0aa"/><circle class="dot" cx="375" cy="1182" r="8" fill="#9aa0aa"/><circle class="dot" cx="404" cy="1182" r="8" fill="#9aa0aa"/>
        </g>
        <g id="msgAnswer" opacity="0">
          <rect x="310" y="1150" width="450" height="200" rx="24" fill="#232a34"/>
          <text x="338" y="1202" font-size="30" font-weight="800" fill="#fff" font-family="Montserrat">📍 Старое Чурилино</text>
          <text x="338" y="1246" font-size="26" fill="#dfe3ea" font-family="Montserrat">Республика Татарстан</text>
          <text x="338" y="1298" font-size="22" fill="${C6.green}" font-family="Montserrat">уверенность: высокая</text>
        </g>
        <g id="msgMap" opacity="0">
          <rect x="310" y="1372" width="330" height="240" rx="24" fill="#1a2a22"/>
          <path d="M310,1470 C400,1450 480,1500 640,1460 M420,1372 C440,1450 400,1530 430,1612 M560,1372 L520,1612" stroke="#4e6b5c" stroke-width="10" fill="none"/>
          <path d="M310,1470 C400,1450 480,1500 640,1460" stroke="#7da08c" stroke-width="3" fill="none"/>
          <g id="pin"><path d="M480,1500 C456,1470 450,1456 450,1444 A30,30 0 1 1 510,1444 C510,1456 504,1470 480,1500 Z" fill="${C6.accent}"/><circle cx="480" cy="1444" r="11" fill="#1a2a22"/></g>
        </g>
      </g>
      ${hand(250, 1500, 1)}${hand(830, 1500, -1)}
    </svg>
  </div>`;

// ─── Реплики и монтаж ─────────────────────────────────────────────────────────

const lines: Line6[] = [
  { t: 0, text: '«Смотри, какое место. Хочу туда»' },
  { t: 2.4, text: '«Где это?»' },
  { t: 3.9, text: '«Без понятия. Подписи нет»' },
  { t: 6.0, text: '«Спроси, кто выложил»' },
  { t: 7.4, text: '«Аккаунт удалён»' },
  { t: 9.0, text: '«Тогда найдём по фото»' },
  { t: 10.8, text: '«В фото же есть координаты?»' },
  { t: 12.8, text: '«Не в Телеграме. Он их стирает»' },
  { t: 18.6, text: '«И что тогда?»' },
  { t: 20.2, text: '«Скинь боту. Он смотрит<br>на вывески, знаки и столбы»' },
  { t: 26.0, text: '«Это же совсем рядом!»' },
  { t: 28.0, text: '«Едем в субботу?»' },
  { t: T.night, text: '' },
];

const cA = (s = 2.05, dy = 120) => ({ fx: A.head.x + 60, fy: A.head.y + dy, s });
const cB = (s = 1.95, dy = 120) => ({ fx: B.head.x - 50, fy: B.head.y + dy, s });
const shots: Shot[] = [
  { t: 0, fx: 540, fy: 1010, s: 1.22, ds: 1.06 },
  { t: 1.2, ...cA(2.1), ds: 1.05 },
  { t: 2.4, ...cB(), fg: 'L' },
  { t: 3.9, ...cA(), fg: 'R' },
  { t: 6.0, ...cB(), fg: 'L' },
  { t: 7.4, ...cA(2.45, 90), ds: 1.07 },
  { t: 9.0, fx: 550, fy: 1060, s: 1.5 },
  { t: 10.8, ...cA(), fg: 'R' },
  { t: 12.8, ...cB(), fg: 'L', ds: 1.08 },
  { t: 18.6, ...cA(2.2), fg: 'R' },
  { t: 20.2, ...cB(), fg: 'L' },
  { t: 26.0, ...cA(2.0), fg: 'R' },
  { t: 28.0, fx: 550, fy: 1060, s: 1.45, ds: 1.08 },
  { t: T.night, fx: 540, fy: 1000, s: 1.2, ds: 1.14 },
];
const dayShots: Shot[] = [
  { t: T.day, fx: 520, fy: 1180, s: 1.12, ds: 1.05 },
  { t: T.swell, fx: A2.head.x + 120, fy: A2.head.y + 150, s: 1.6, ds: 1.06 },
];

const acts = [
  // начальные позы
  pose(A, 'R', POSE.phone, 0, 0), pose(A, 'L', POSE.rest, 0, 0), pose(B, 'L', POSE.rest, 0, 0), pose(B, 'R', POSE.rest, 0, 0),
  screen(A, true, 0.2), tilt(A, 4, 1.2),
  // «Где это?»
  face(B, 'think', 2.4), pose(B, 'L', POSE.wave, 2.45), tilt(B, -7, 2.5),
  // «Без понятия»
  face(A, 'doubt', 3.9), pose(A, 'L', POSE.shrug, 4.0), tilt(A, -6, 4.0), pose(A, 'L', POSE.rest, 5.5), pose(B, 'L', POSE.rest, 3.9),
  // «Спроси, кто выложил»
  face(B, 'calm', 6.0), pose(B, 'L', POSE.point, 6.05), tilt(B, 0, 6.0), pose(B, 'L', POSE.rest, 7.2),
  // «Аккаунт удалён»
  face(A, 'sad', 7.4), tilt(A, 10, 7.4, 0.6),
  // «Тогда найдём по фото»
  face(B, 'smile', 9.0), pose(B, 'L', POSE.wave, 9.05), wave(B, 'L', POSE.wave, 9.45, 2), face(A, 'neutral', 9.4), tilt(A, 0, 9.2),
  // «В фото же есть координаты?»
  face(A, 'think', 10.8), pose(A, 'L', POSE.wave, 10.85), pose(B, 'L', POSE.rest, 10.8),
  // «Не в Телеграме»
  face(B, 'smirk', 12.8), pose(B, 'L', POSE.point, 12.85), pose(A, 'L', POSE.rest, 12.9), pose(B, 'L', POSE.rest, 15.0),
  // «И что тогда?»
  face(A, 'doubt', 18.6), pose(A, 'L', POSE.shrug, 18.65), tilt(A, -5, 18.6),
  // «Скинь боту»
  face(B, 'grin', 20.2), pose(B, 'L', POSE.wave, 20.25), wave(B, 'L', POSE.wave, 20.6, 2), pose(A, 'L', POSE.rest, 20.3), tilt(A, 0, 20.3),
  // «Это же совсем рядом!»
  face(A, 'shock', 26.0), face(A, 'grin', 26.6), pose(A, 'L', POSE.up, 26.1, 0.3), wave(A, 'L', POSE.up, 26.45, 2, 20),
  // «Едем в субботу?»
  face(B, 'happy', 28.0), pose(B, 'L', POSE.wave, 28.05), pose(A, 'L', POSE.rest, 28.1), nod(A, 28.5), face(A, 'happy', 28.4),
  blinks(A, [1.8, 5.2, 9.7, 11.9, 19.4, 24.8, 27.4]),
  blinks(B, [3.1, 6.8, 10.2, 13.5, 21.0, 28.9]),
  // лампа чуть дышит
  `tl.to('#lampGlow', { opacity: 0.8, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 8 }, 0);`,
  // затишье в музыке: ночь, свет гаснет, оба засыпают, часы перескакивают на утро
  pose(A, 'R', POSE.rest, T.night + 0.1, 0.6), screen(A, false, T.night + 0.2),
  `tl.to('#lampGlow', { opacity: 0, duration: 0.8 }, ${T.night + 0.4}); tl.to('#room .cam', { filter: 'brightness(0.55)', duration: 1.2 }, ${T.night + 0.4});`,
  face(A, 'sleepy', T.night + 0.9), tilt(A, 14, T.night + 0.9, 0.9), face(B, 'sleepy', T.night + 1.3), tilt(B, -14, T.night + 1.3, 0.9),
];

const dayActs = [
  pose(A2, 'R', POSE.phone, T.day, 0), pose(A2, 'L', POSE.down, T.day, 0), pose(B2, 'L', POSE.down, T.day, 0), pose(B2, 'R', POSE.down, T.day, 0),
  screen(A2, true, T.day),
  pose(B2, 'R', POSE.point, T.day + 0.15), face(B2, 'grin', T.day + 0.15),
  pose(A2, 'R', [68, -112], T.swell + 0.2, 0.45), tilt(A2, 6, T.swell + 0.2), face(A2, 'calm', T.swell + 0.3),
  `tl.set('#flash', { opacity: 0.9 }, ${T.shot}); tl.to('#flash', { opacity: 0, duration: 0.35 }, ${T.shot + 0.05});`,
  face(A2, 'happy', T.shot + 0.2), face(B2, 'happy', T.shot + 0.2), pose(B2, 'R', POSE.down, T.shot + 0.3), nod(B2, T.shot + 0.5),
  blinks(A2, [T.day + 0.6]), blinks(B2, [T.swell + 0.4]),
];

const infoTweens = [
  `tl.fromTo('#info', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${T.info[0]});`,
  `tl.fromTo('#row1', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, ${T.info[0] + 0.3});`,
  `tl.fromTo('#row2', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, ${T.info[0] + 1.1});`,
  `tl.fromTo('#ih2', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, ${T.info[1]});`,
  ...[0, 1, 2, 3, 4].map((i) => `tl.fromTo('#clue${i}', { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(2)' }, ${(T.info[1] + 0.35 + i * 0.32).toFixed(2)});`),
  `tl.to('#info', { opacity: 0, duration: 0.25 }, ${T.info[2] - 0.25});`,
];

const P0 = T.phone[0];
const phoneTweens = [
  `tl.fromTo('#phoneUI', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${P0});`,
  `tl.fromTo('#phoneBody', { y: 120 }, { y: 0, duration: 0.45, ease: 'power3.out' }, ${P0});`,
  `tl.fromTo('#msgPhoto', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, ${P0 + 0.3});`,
  `tl.set('#msgTyping', { opacity: 1 }, ${P0 + 1.0}); tl.set('#msgTyping', { opacity: 0 }, ${P0 + 2.0});`,
  `tl.to('.dot', { y: -8, duration: 0.18, stagger: 0.1, yoyo: true, repeat: 3, ease: 'sine.inOut' }, ${P0 + 1.05});`,
  `tl.fromTo('#msgAnswer', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${P0 + 2.0});`,
  `tl.fromTo('#msgMap', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${P0 + 3.1});`,
  `tl.fromTo('#pin', { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'bounce.out' }, ${P0 + 3.35});`,
  `tl.to('#phoneUI', { opacity: 0, duration: 0.25 }, ${T.phone[1] - 0.25});`,
];

const ctaGlyph = '<path d="M0,30 C-20,6 -24,-4 -24,-10 A24,24 0 1 1 24,-10 C24,-4 20,6 0,30 Z"/><circle cy="-10" r="8"/>';
const cap = captions(lines, T.night);

export const v02: Video6 = {
  id: '02-koordinaty',
  title: 'GeoBot: Telegram стирает координаты',
  end: END,
  body: `
      <div class="clip scene" id="room" data-start="0" data-duration="${T.day}">
        <div class="cam" id="cam">${svg6(room)}</div>
        ${FOREGROUND}
        <div class="grain"></div>
        ${info}
        ${phoneUI}
      </div>
      <div class="clip label6" data-start="0" data-duration="2.4">ПЯТНИЦА · 23:14<b>●</b></div>
      <div class="clip label6" data-start="${T.night}" data-duration="${(T.day - T.night - 1.9).toFixed(2)}">ПЯТНИЦА · 23:59<b>●</b></div>
      <div class="clip label6" data-start="${(T.day - 1.9).toFixed(2)}" data-duration="1.9">СУББОТА · 05:30<b>●</b></div>
      ${cap.html}
      <div class="clip scene" id="day" data-start="${T.day}" data-duration="${(T.cta - T.day).toFixed(2)}">
        <div class="cam" id="cam2">${svg6(day)}</div>
        <div class="grain"></div>
      </div>
      <div class="clip label6" data-start="${T.day}" data-duration="${(T.cta - T.day).toFixed(2)}">СУББОТА · 07:40</div>
      <div class="clip scene" id="cta" data-start="${T.cta}" data-duration="${(END - T.cta).toFixed(2)}" style="background:#000">
        <div class="ctaBox6"><div id="ctaIcon">${ctaIcon(ctaGlyph)}</div><div id="ctaText">GeoSleuth в Telegram</div></div>
      </div>`,
  tweens: [
    shotTweens(shots, T.day),
    shotTweens(dayShots, T.cta, '#cam2'),
    ...acts, ...dayActs, ...infoTweens, ...phoneTweens,
    `tl.fromTo('#ctaIcon', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${T.cta});`,
    `tl.fromTo('#ctaText', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, ${T.cta + 0.1});`,
    `tl.to('#ctaIcon', { scale: 1.05, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 3 }, ${T.cta + 0.45});`,
  ].join('\n      '),
};
