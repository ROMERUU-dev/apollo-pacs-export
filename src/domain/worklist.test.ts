import { describe, expect, it } from 'vitest';
import type { WorklistItem } from '../api/operations';
import { continuesSameVisit } from './worklist';

function item(overrides: Partial<WorklistItem> = {}): WorklistItem {
  return {
    order_id: 'order', encounter_id: 'encounter-1',
    patient: { mrn: 'MRN', first_name: 'Ana', last_name: 'Lopez' },
    procedure: { accession_number: 'ACC', modality: 'MG', status: 'scheduled' },
    ...overrides,
  };
}

describe('continuesSameVisit', () => {
  it('is false for the first row regardless of encounter', () => {
    expect(continuesSameVisit([item()], 0)).toBe(false);
  });

  it('is true when two adjacent rows share an encounter (MG + US composite offering)', () => {
    const items = [item({ order_id: 'mg', procedure: { accession_number: 'A1', modality: 'MG', status: 'scheduled' } }),
      item({ order_id: 'us', procedure: { accession_number: 'A2', modality: 'US', status: 'scheduled' } })];
    expect(continuesSameVisit(items, 1)).toBe(true);
  });

  it('is false when adjacent rows belong to different encounters', () => {
    const items = [item({ order_id: 'a', encounter_id: 'encounter-1' }), item({ order_id: 'b', encounter_id: 'encounter-2' })];
    expect(continuesSameVisit(items, 1)).toBe(false);
  });

  it('is false when encounter_id is missing (legacy row without C1 context)', () => {
    const items = [item({ order_id: 'a', encounter_id: undefined }), item({ order_id: 'b', encounter_id: undefined })];
    expect(continuesSameVisit(items, 1)).toBe(false);
  });
});
