import { describe, it, expect } from 'vitest';
import { PIPELINE_STEPS, getStatusIndex } from '../../shared/types.js';

describe('US-0.5: Backend Testing Harness Sanity', () => {
  it('loads shared pipeline domain steps accurately', () => {
    expect(PIPELINE_STEPS).toHaveLength(5);
    expect(PIPELINE_STEPS[0].key).toBe('STYLE');
    expect(PIPELINE_STEPS[1].key).toBe('CHARACTERS');
    expect(PIPELINE_STEPS[2].key).toBe('PORTRAITS');
    expect(PIPELINE_STEPS[3].key).toBe('CHAPTERS');
    expect(PIPELINE_STEPS[4].key).toBe('ILLUSTRATIONS');
  });

  it('calculates status indices correctly', () => {
    expect(getStatusIndex('CREATED')).toBe(0);
    expect(getStatusIndex('STYLE_SET')).toBe(1);
    expect(getStatusIndex('CHARACTERS_GENERATED')).toBe(2);
    expect(getStatusIndex('PORTRAITS_GENERATED')).toBe(3);
    expect(getStatusIndex('CHAPTERS_GENERATED')).toBe(4);
    expect(getStatusIndex('DONE')).toBe(5);
  });
});
