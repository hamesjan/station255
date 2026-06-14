// Central tunables for the whole game: the calming "bright day" palette and the
// physical dimensions of the station. Colors are hex strings because they are
// painted onto 2D canvases to make textures; convert to THREE.Color where a
// numeric color is needed.

export const PALETTE = {
  skyTop: '#4fb0ff',
  skyBottom: '#d6f1ff',
  cloud: '#ffffff',

  floorTile: '#f1f8ec',
  floorGrout: '#bcd6bb',
  edgeStrip: '#ffd23d',

  wallPanel: '#f3faf1',
  wallLine: '#c9e6c7',
  pillar: '#e9f4e4',
  canopy: '#f6fcf3',

  trainBody: '#79e0a0',
  trainTrim: '#2fbf6e',
  trainWindow: '#a6e4ff',
  trainSill: '#5fcb88',

  platformSide: '#d6ead3',
  pitFloor: '#6a786d',
  rail: '#aab8aa',

  // subway dressing: tiled walls, concrete, lockers, bins, signage, neon
  tileWall: '#eaf3f4',
  tileGrout: '#9fc0c2',
  tileAccent: '#34b3cf',
  concrete: '#bcc1b8',
  concreteDark: '#9aa094',
  locker: '#3f7fae',
  lockerTrim: '#27557a',
  lockerHandle: '#d7e2ea',
  trash: '#357a52',
  trashLid: '#27583c',
  signGreen: '#1f8a4c',
  signYellow: '#f4c400',
  signBlue: '#2a5ec0',
  signRed: '#d63b36',
  neon: '#5fe0ff',
  tunnelDark: '#10161b',
} as const;

// The world beyond the platform: grass, water, trees, flowers, and the potted
// plants dotted along the station. Kept separate so the built environment and
// the living scenery can be tuned independently.
export const NATURE = {
  grass: '#74c95f',
  grassDark: '#54aa49',
  grassLight: '#9ee07c',
  water: '#4cb8ec',
  waterDeep: '#2f93cf',
  waterFoam: '#cdf2ff',
  foliage: '#57b552',
  foliageLight: '#88d96d',
  foliageDeep: '#3f9a47',
  trunk: '#9c6b43',
  trunkDark: '#7a5031',
  soil: '#6b4a35',
  planter: '#d98b5a',
  planterDark: '#b96f43',
  flowerA: '#ff77ad',
  flowerB: '#ffd23d',
  flowerC: '#c98bff',
  flowerD: '#ff8a4c',
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

// The underground concourse: a stairwell cut into the back wall descends to a
// tiled subway hallway running below the platform. Heights are world Y (the
// platform floor is DIMS.floorY = 0; the hall sits well below it).
export const SUBWAY = {
  stairCx: -6, // x-centre of the stairwell opening
  stairHalfW: 1.6, // half-width of the opening / stairwell
  openTopY: 2.7, // height of the doorway cut in the back wall

  topY: 0, // platform level
  botY: -3.6, // hallway floor level
  rampTopZ: -4.4, // where the descent begins (the back wall line)
  rampBotZ: -11.0, // where it reaches hallway level
  stairMinZ: -13.0, // walkable stairwell extent (overlaps the hall)
  stairMaxZ: -4.0, // overlaps the platform lip

  hallMinX: -20,
  hallMaxX: 20,
  hallMinZ: -24,
  hallMaxZ: -10.5, // overlaps the stair landing
  ceilY: -0.2, // hallway ceiling height (just under the platform)
} as const;
