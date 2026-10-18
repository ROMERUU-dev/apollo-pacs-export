import type { WorklistItem } from '../api/operations';

/** True when `items[index]` belongs to the same visit (Encounter) as the row right before it —
 * e.g. the two rows a composite Offering (MG + US) produces. Worklist rows already arrive
 * ordered by scheduled time, so "same visit" only ever means "adjacent". */
export function continuesSameVisit(items: WorklistItem[], index: number): boolean {
  if (index <= 0) return false;
  const encounterId = items[index].encounter_id;
  return !!encounterId && encounterId === items[index - 1].encounter_id;
}
