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
