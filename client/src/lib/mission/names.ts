import { counted } from '@/lib/counted';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

/** What the show calls an actor: the editor's name for it, or its kind, numbered when shared. */
export function actorName(mission: Mission, index: number): string {
  const actor = mission.actors[index];
  if (actor.name) return actor.name;
  const kind = t.mission.kinds[actor.kind];
  const same = mission.actors.filter((other) => other.kind === actor.kind && !other.name);
  return same.length > 1 ? `${kind} ${same.indexOf(actor) + 1}` : kind;
}

/** How many actors move on the ground, for a stage's facts. */
export const movers = (mission: Mission) =>
  counted(mission.actors.filter((actor) => actor.keys.length > 0).length, t.mission.facts.oneMover, t.mission.facts.movers);
