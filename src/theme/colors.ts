// Mode identity. Practice and Game plan share the green family ("preparation"
// — Practice is the lighter, more open sage; Game plan is the deeper, more
// committed forest). Tournament breaks the family with a warm orange — it's
// the one that's for real, and the visual shift signals stakes.
export const MODE = {
  practice: '#7a9e5c',
  gamePlan: '#3f6f5a',
  tournament: '#dd6a3a',
} as const;

// Light-tinted backgrounds derived from each mode color, for selected pills,
// resume cards, plan reference cards, etc. Soft enough to read as a hint, not
// a button.
export const MODE_TINT = {
  practice: '#e6efde',
  gamePlan: '#dfece6',
  tournament: '#fbe6d6',
} as const;

export const INBAG_GREEN = '#3a9e5c';

export const CONFIDENCE = {
  high: '#4a9e5c',
  low: '#c4a84a',
  none: '#555870',
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
