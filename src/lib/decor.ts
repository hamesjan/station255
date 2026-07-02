// Hand-drawn pixel-art clutter for the homepage "hangout" section — same
// grid-to-SVG technique as the tool icons in icons.ts (reused, not duplicated).
import { icon } from './icons';

export const decor: Record<string, string> = {
  pizzaBox: icon([
    'KKKKKKKK',
    'KTTTTTTK',
    'KTYYYYTK',
    'KTYOYOTK',
    'KTYYYYTK',
    'KTOYOYTK',
    'KTTTTTTK',
    'KKKKKKKK',
  ]),
  sodaCan: icon([
    '.GGGG.',
    'GRRRRG',
    'GRWWRG',
    'GRRRRG',
    'GRRRRG',
    'GRWWRG',
    'GRRRRG',
    'GRRRRG',
    'GGGGGG',
  ]),
  chipBag: icon([
    '.YYYYY.',
    'YYYYYYY',
    'YRRRRRY',
    'YRYYYRY',
    'YRYYYRY',
    'YRRRRRY',
    'YYYYYYY',
    '.YYYYY.',
  ]),
  bananaPeel: icon([
    '..YY....',
    '.YYYY...',
    'YYYYYY..',
    '.YYYYYY.',
    '..YYYY..',
    '...YY...',
  ]),
  paperBall: icon([
    '.WWWW.',
    'WWGWWW',
    'WGWWGW',
    'WWWGWW',
    'WWWWWW',
    '.WWWW.',
  ]),
  bulbM: icon(['.M.', 'MMM', '.M.']),
  bulbC: icon(['.C.', 'CCC', '.C.']),
  bulbY: icon(['.Y.', 'YYY', '.Y.']),
  coin: icon([
    '.YYYY...',
    'YYYYYY..',
    'YYOOYY..',
    'YYOOYY..',
    'YYYYYY..',
    '.YYYY...',
  ]),
};

// Hangout mascot — a hand-drawn sitting pixel character (mirrored halves,
// same 12-wide symmetric shape, two recolors so it reads as two people).
const mascotRows: string[] = (() => {
  const halves = [
    '..KKKK',
    '.KKKKK',
    '.KTTTT',
    '.KTBTT',
    '.KTTTT',
    '..TTTT',
    '..CCCC',
    'CCCCCC',
    'CCCCCC',
    '.CCCCC',
    '.PPPPP',
    'PPPPPP',
    'PP..PP',
    'DD..DD',
  ];
  return halves.map((h) => h + [...h].reverse().join(''));
})();

export const mascot1 = icon(mascotRows);
export const mascot2 = icon(mascotRows, { C: '#ffd23f', K: '#3d3466' });
