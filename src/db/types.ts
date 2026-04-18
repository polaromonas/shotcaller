export const THROW_TYPES = ['Backhand', 'Forehand', 'Overhand'] as const;
export type ThrowType = (typeof THROW_TYPES)[number];

export const SHOT_SHAPES = [
  'Hyzer',
  'Flat',
  'Anhyzer',
  'Flex',
  'Turnover',
  'Roller',
  'Spike hyzer',
  'Thumber',
  'Tomahawk',
] as const;
export type ShotShape = (typeof SHOT_SHAPES)[number];

export const OVERHAND_SHOT_SHAPES: readonly ShotShape[] = ['Thumber', 'Tomahawk'];

export const RESULTS = ['Basket', 'C1', 'C2', 'Fairway', 'Rough', 'OB'] as const;
export type ResultKind = (typeof RESULTS)[number];

export const DISC_CATEGORIES = ['DD', 'FWD', 'MID', 'P&A'] as const;
export type DiscCategory = (typeof DISC_CATEGORIES)[number];

export const DEFAULT_TAGS = [
  'Flippy',
  'Overstable',
  'Understable',
  'Stable',
  'Beat-in',
  'Gamer',
  'New',
  'Roller disc',
] as const;
