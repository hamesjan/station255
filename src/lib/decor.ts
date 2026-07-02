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
};
