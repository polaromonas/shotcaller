import { Platform } from 'react-native';
import type { GamePlanContext } from '../db/gamePlan';

export const isExportSupported = Platform.OS === 'web';

export function downloadTextFile(filename: string, content: string): void {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof URL === 'undefined'
  ) {
    throw new Error('downloadTextFile is only supported on web');
  }
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'plan';

export function gamePlanFilename(ctx: GamePlanContext): string {
  return `shotcaller-${slugify(ctx.courseName)}-${slugify(ctx.layoutName)}-${todayIso()}.txt`;
}

export function gamePlanToText(
  ctx: GamePlanContext,
  discsById: Map<
    number,
    {
      manufacturer: string;
      model: string;
      nickname: string | null;
      category: string;
    }
  >
): string {
  const lines: string[] = [];
  lines.push('ShotCaller — Game Plan');
  lines.push(`${ctx.courseName} · ${ctx.layoutName}`);
  lines.push(`Generated ${todayIso()}`);
  lines.push('');

  for (const rec of ctx.holes) {
    const distance =
      rec.hole.distance_ft > 0 ? `${rec.hole.distance_ft} ft` : 'distance not set';
    lines.push(`Hole ${rec.hole.hole_number} · Par ${rec.hole.par} · ${distance}`);
    if (rec.savedPlan) {
      const disc = discsById.get(rec.savedPlan.disc_id);
      const discLabel = disc
        ? disc.nickname
          ? `${disc.nickname} (${disc.manufacturer} ${disc.model}, ${disc.category})`
          : `${disc.manufacturer} ${disc.model} (${disc.category})`
        : `Disc #${rec.savedPlan.disc_id}`;
      lines.push(`  Disc:  ${discLabel}`);
      lines.push(
        `  Shot:  ${rec.savedPlan.throw_type} · ${rec.savedPlan.shot_shape}`
      );
      if (rec.savedPlan.notes && rec.savedPlan.notes.trim().length > 0) {
        lines.push(`  Notes: ${rec.savedPlan.notes.trim()}`);
      }
    } else {
      lines.push('  (no plan saved for this hole)');
    }
    lines.push('');
  }

  return lines.join('\n');
}
