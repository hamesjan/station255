// Central tunables for the whole game: the calming "bright day" palette and the
// physical dimensions of the station. Colors are hex strings because they are
// painted onto 2D canvases to make textures; convert to THREE.Color where a
// numeric color is needed.

export const PALETTE = {
  skyTop: '#8fc6ff',
  skyBottom: '#e2f1ff',
  cloud: '#ffffff',

  floorTile: '#e9efe6',
  floorGrout: '#c6d3c3',
  edgeStrip: '#efe19a',

  wallPanel: '#eef4ec',
  wallLine: '#d2ddcf',
  pillar: '#e4ece1',
  canopy: '#f1f6ef',

  trainBody: '#d2ecda',
  trainTrim: '#86c193',
  trainWindow: '#cfe9ff',
  trainSill: '#a9d4b4',

  platformSide: '#dde6db',
  pitFloor: '#717c74',
  rail: '#b6bfb6',
} as const;

export const DIMS = {
  // X runs along the platform length; Z runs across it.
  length: 110,
  halfLength: 55,

  walkMinZ: -4.4, // back-wall side of the walkable strip
  walkMaxZ: 4.4, // platform-edge side
  floorY: 0,

  eyeHeight: 1.7,
  playerRadius: 0.34,
  moveSpeed: 3.4,

  wallHeight: 4.4,
  canopyZBack: -4.7,
  canopyZFront: 5.0,

  pitDepth: 1.3,
  pitZStart: 4.4, // platform edge (also the player's Z limit)
  pitZEnd: 9.0, // where the train sits

  trainHeight: 3.4,
  trainDepth: 3.2,
  trainZ: 10.6, // center of the train box
} as const;
