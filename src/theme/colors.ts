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
