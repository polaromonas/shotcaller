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

export const SESSION_MODES = ['Practice', 'Tournament'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export const DISC_SORTS = [
  'bag-order',
  'alphabetical',
  'speed-fast',
  'speed-slow',
] as const;
export type DiscSort = (typeof DISC_SORTS)[number];

export const DEFAULT_DISC_SORT: DiscSort = 'bag-order';

// Shot tags should describe what the player did with the shot — effort, line,
// release height — not outcome or environment (those go in notes). Five
// starter tags; users add their own from the throw form.
export const DEFAULT_SHOT_TAGS = [
  'Full send',
  'Low',
  'High',
  'Layup',
  'Soft',
] as const;

// Tags that were seeded as defaults in an earlier build but have since been
// dropped from the recommended set (outcome/environment, which don't fit the
// "what the player did" framing). Pruned on next launch from any DB that
// still has them, but only if they aren't referenced by any throw_tag join —
// that way a user's custom tag with the same name (and actual usage) is safe.
export const LEGACY_SHOT_TAG_NAMES = [
  'Headwind',
  'Tailwind',
  'Tree hit',
  'Park job',
] as const;

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
