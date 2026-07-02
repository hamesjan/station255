export const COLORS: Record<string, string> = {
  B: '#0d0b1a',
  W: '#ffffff',
  M: '#ff2e88',
  C: '#21e6c1',
  Y: '#ffd23f',
  G: '#b0abd0',
  N: '#55cc55',
  L: '#5599ff',
  O: '#ff9900',
  R: '#ff5555',
  P: '#3d3466',
  D: '#1e1838',
  T: '#e8b878',
  K: '#7a4a2a',
};

export function icon(rows: string[]): string {
  const cols = rows[0].length;
  const rects = rows
    .flatMap((row, y) =>
      [...row].map((c, x) =>
        c === '.' ? null : `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[c]}"/>`
      )
    )
    .filter(Boolean)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows.length}" shape-rendering="crispEdges">${rects}</svg>`;
}

export const icons: Record<string, string> = {
  'palette-extractor': icon([
    'BBBBBBBB',
    'BMMMBYYB',
    'BMMMBYYB',
    'BMMMBYYB',
    'BCCCBLLB',
    'BCCCBLLB',
    'BCCCBLLB',
    'BBBBBBBB',
  ]),

  'demake': icon([
    'MMMMLLLL',
    'MMMMLLLL',
    'MMMMLLLL',
    'MMMMLLLL',
    'CCCCYYYY',
    'CCCCYYYY',
    'CCCCYYYY',
    'CCCCYYYY',
  ]),

  'crt': icon([
    'BBBBBBBB',
    'BCGCGCGB',
    'BGCGCGCB',
    'BCGCGCGB',
    'BGCGCGCB',
    'BBBBBBBB',
    '...BB...',
    '...BB...',
  ]),

  'pixel-text': icon([
    '..YYYY..',
    '.YYYYYY.',
    'YY....YY',
    'YY....YY',
    'YYYYYYYY',
    'YY....YY',
    'YY....YY',
    '........',
  ]),

  'dither': icon([
    'WBWBWBWB',
    'BWBWBWBW',
    'WWBBWWBB',
    'BBWWBBWW',
    'WBWBWBWB',
    'BWBWBWBW',
    'WWBBWWBB',
    '........',
  ]),

  'upscale': icon([
    'MM......',
    'MM......',
    '........',
    '...CCCCC',
    '...CCCCC',
    '...CCCCC',
    '...CCCCC',
    '...CCCCC',
  ]),

  'ascii': icon([
    '..GGG...',
    '.G...G..',
    'G.....G.',
    'G.....G.',
    'GGGGGGG.',
    'G.....G.',
    'G.....G.',
    '........',
  ]),

  'avatar': icon([
    '.MMMMMM.',
    'MMMMMMMM',
    'M..MM..M',
    'MMMMMMMM',
    'M.MMMM.M',
    '.M.MM.M.',
    '.MMMMMM.',
    '........',
  ]),

  'vhs': icon([
    'BBBBBBBB',
    'BWWWWWWB',
    'BWWWWWWB',
    'BBBBBBBB',
    'BB....BB',
    'BBOBBOBB',
    'BBBBBBBB',
    '........',
  ]),

  'sfx': icon([
    '..M.....',
    '.MM.C...',
    'MMM.C.C.',
    'MMM.CCC.',
    'MMM.C.C.',
    '.MM.C...',
    '..M.....',
    '........',
  ]),

  'sprite-slicer': icon([
    'BBBBBBBB',
    'BMMBBYYB',
    'BMMBBYYB',
    'BBBBBBBB',
    'BCCBBLLB',
    'BCCBBLLB',
    'BBBBBBBB',
    '........',
  ]),

  'badge': icon([
    '..YYYY..',
    '.YYYYYY.',
    'YYYYYYYY',
    'YYY..YYY',
    '.YYYYYY.',
    '..YYYY..',
    '.BBYYBB.',
    'BBBBBBB.',
  ]),

  'color': icon([
    '...C....',
    '..CMC...',
    '.CMYMC..',
    'CMYYYYMC',
    '.CMYYMC.',
    '..CMMC..',
    '...CC...',
    '........',
  ]),

  'bootscreen': icon([
    'BBBBBBBB',
    'BGGGGGGB',
    'BGGGGGGB',
    'BGGGCGBB',
    'BGGGGGGB',
    'BGGGGGGB',
    'BBBBBBBB',
    '........',
  ]),

  'gradient': icon([
    'MMMMMMMM',
    'OOOOOOOO',
    'YYYYYYYY',
    'NNNNNNNN',
    'CCCCCCCC',
    'LLLLLLLL',
    '........',
    '........',
  ]),

  'sticker': icon([
    '..WWWW..',
    '.WCCCWW.',
    'WCCCCCW.',
    'WCCCCCW.',
    'WCCCCCW.',
    '.WCCCWW.',
    '..WWWW..',
    '........',
  ]),

  'noise': icon([
    'BWMBCWLM',
    'WMCBLWGB',
    'CBLWMCBW',
    'WMBCWLMC',
    'BLWMCBLW',
    'WCBLWMCB',
    'MBCWLWMB',
    '........',
  ]),

  'waveform': icon([
    '...LL...',
    '..LLLL..',
    '.LLLLLL.',
    'LLLLLLLL',
    '.LLLLLL.',
    '..LLLL..',
    '...LL...',
    '........',
  ]),

  'sprite-painter': icon([
    'BBBBBB..',
    'BMMYYB..',
    'BMMYYB..',
    'BMMYYB..',
    'BMMYYB..',
    'BBBBBB..',
    '.....M..',
    '......MM',
  ]),

  'glitch': icon([
    'MMMMMMMM',
    'MMMMMMMM',
    'CCCCCCCC',
    '....CCCC',
    'MMMM....',
    'LLLLLLLL',
    'LLLLLLLL',
    '........',
  ]),

  'bitcrusher': icon([
    '.CC.....',
    'CCC.C...',
    'CC..CC..',
    '....CCC.',
    '....CCCC',
    '.....CCC',
    '......CC',
    '........',
  ]),

  'qr-pixel': icon([
    'BBBBBBB.',
    'B.....B.',
    'B.BBB.B.',
    'B.B.B.B.',
    'B.BBB.B.',
    'B.....B.',
    'BBBBBBB.',
    '........',
  ]),

  'console-frame': icon([
    'GGGGGGGG',
    'GBBBBBGG',
    'GB.WW.GG',
    'GB.WW.GG',
    'GB.WW.GG',
    'GBBBBBGG',
    'GGGGGGGG',
    'GG.GG.GG',
  ]),

  'color-ramp': icon([
    'MMMMMM..',
    'MMOOMM..',
    'OOOOOOO.',
    'OYYYYOO.',
    'YYYYYY..',
    'YYCCCCY.',
    'CCCCCC..',
    '........',
  ]),

  'pattern-tile': icon([
    'M.M.M.M.',
    '.M.M.M.M',
    'M.M.M.M.',
    '.M.M.M.M',
    'M.M.M.M.',
    '.M.M.M.M',
    'M.M.M.M.',
    '........',
  ]),

  'sprite-animator': icon([
    'BBBBBBBB',
    'BMBBBCBB',
    'BMBBBCBB',
    'BBBBBBBB',
    'BYBBBMBB',
    'BYBBBMBB',
    'BBBBBBBB',
    '........',
  ]),

  'pixel-clock': icon([
    'BYYYYB..',
    'B....B..',
    'BYYYYB..',
    'B....B..',
    'BYYYYB..',
    '........',
    '........',
    '........',
  ]),

  'type-tester': icon([
    'MMMMMMMM',
    'MMMMMMMM',
    '........',
    'CCCCCCCC',
    'CCCC....',
    '........',
    'YYYYYYYY',
    '........',
  ]),
};
