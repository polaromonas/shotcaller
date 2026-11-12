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

export const DISC_CATEGORIES = ['DD', 'FWD', 'MID', 'P&A'] as const;
export type DiscCategory = (typeof DISC_CATEGORIES)[number];

// Full-word display labels. The stored values stay the short codes; these are
// shown wherever there's room (bag list, disc picker, caddie card). The
// Add-Disc segmented control keeps the short codes for space.
export const CATEGORY_LABELS: Record<DiscCategory, string> = {
  DD: 'Distance',
  FWD: 'Fairway',
  MID: 'Midrange',
  'P&A': 'Putter',
};

// Section-header form for lists grouped by category (My Bag, disc picker):
// abbreviation + long label. The code stays uppercase — it is an abbreviation,
// not display styling.
export const CATEGORY_GROUP_LABELS: Record<DiscCategory, string> = {
  DD: 'DD — Distance drivers',
  FWD: 'FWD — Fairway drivers',
  MID: 'MID — Midranges',
  'P&A': 'P&A — Putt & approach',
};

// Disc weight in whole grams. Generous bounds — PDGA-legal discs top out
// around 200 g — so a typo is caught without second-guessing real discs.
export const DISC_WEIGHT_MIN_G = 1;
export const DISC_WEIGHT_MAX_G = 250;

export const DISC_SORTS = [
  'bag-order',
  'alphabetical',
  'speed-fast',
  'speed-slow',
] as const;
export type DiscSort = (typeof DISC_SORTS)[number];

export const DEFAULT_DISC_SORT: DiscSort = 'bag-order';

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
