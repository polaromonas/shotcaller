// Mode identity (V2). Two modes, two signature colors — PLAN indigo for
// authoring surfaces, PLAY teal for the on-course caddie card. Applied to
// badges, selected pills/segments, and primary buttons; never reused for
// unrelated UI. (V1's three-color practice/gamePlan/tournament palette is gone.)
export const MODE = {
  plan: '#5B4FC7',
  play: '#0E8C8C',
} as const;

// Light-tinted backgrounds derived from each mode color, for selected pills,
// resume cards, plan reference cards, etc. Soft enough to read as a hint, not
// a button.
export const MODE_TINT = {
  plan: '#e6e3f7',
  play: '#d5ecec',
} as const;

export const INBAG_GREEN = '#3a9e5c';

// Dark shell — the V2 design's default surface for every screen except the
// Play caddie card (which gets its own sunlight-first light theme). Values from
// design_handoff_shotcaller_v2/README.md. Introduced with the Plan-a-Hole
// screen; other screens migrate onto it as they're rebuilt.
export const SHELL = {
  bg: '#101216',
  card: '#171A20',
  border: '#232733',
  dashed: '#3a4050',
  text: '#EDEEF2',
  textSecondary: '#B7BBC6',
  textMuted: '#8B909B',
  textFaint: '#5c6270',
  selectedFill: '#1E2032', // disc row fill when picked, paired with a 2px plan border
} as const;

// Font families (loaded at startup in App.tsx). Barlow Condensed carries display
// type — disc names, hole numerals, section labels; Barlow carries body/notes.
export const FONT = {
  bc600: 'BarlowCondensed_600SemiBold',
  bc700: 'BarlowCondensed_700Bold',
  bc800: 'BarlowCondensed_800ExtraBold',
  b400: 'Barlow_400Regular',
  b500: 'Barlow_500Medium',
  b600: 'Barlow_600SemiBold',
  b700: 'Barlow_700Bold',
} as const;

export const UI = {
  bg: '#ffffff',
  surface: '#f6f7fb',
  border: '#e3e5ee',
  text: '#1a1c2a',
  textMuted: '#555870',
  textInverse: '#ffffff',
  danger: '#d64545',
  dangerBg: '#d64545',
} as const;

export const DISC_SWATCHES: readonly string[] = [
  '#e63946',
  '#ff6b35',
  '#ffdd00',
  '#f4a261',
  '#6ab04c',
  '#2a9d8f',
  '#00b4d8',
  '#457b9d',
  '#1d3557',
  '#9b5de5',
  '#ff006e',
  '#ff99c8',
  '#7f5539',
  '#ffffff',
  '#cccccc',
  '#2a2d3a',
];
