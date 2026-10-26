import { describe, expect, it } from 'vitest';
import schema from '../../../openapi.json';
import { newMission } from './defaults';

type Property = { default?: unknown };
const missionInput = schema.components.schemas['Mission-Input'].properties as Record<string, Property>;

describe('newMission', () => {
  // The server fills these in for a mission saved before a field existed, so a new mission in
  // the interface has to start from the same numbers.
  it('starts from the defaults the server applies', () => {
    const mission = newMission();
    for (const [field, property] of Object.entries(missionInput)) {
      if (!('default' in property) || typeof property.default === 'object') continue;
      expect(mission[field as keyof typeof mission], field).toEqual(property.default);
    }
  });

  it('has every field the server knows about, and no others', () => {
    expect(Object.keys(newMission()).sort()).toEqual(Object.keys(missionInput).sort());
  });
});
