import { describe, expect, it } from 'vitest';
import {
  SNAPSHOT_SCHEMA_VERSION,
  UNIVER_ENGINE_ID,
  isSnapshotEnvelope,
  unwrapUniverSnapshot,
  wrapSnapshot,
} from './snapshot';

describe('snapshot envelope', () => {
  it('wraps and unwraps a supported snapshot', () => {
    const envelope = wrapSnapshot({ cells: [] });
    expect(envelope.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(envelope.engine).toBe(UNIVER_ENGINE_ID);
    expect(unwrapUniverSnapshot(envelope)).toEqual({ cells: [] });
  });

  it('rejects an unsupported schema version', () => {
    expect(unwrapUniverSnapshot({ schemaVersion: 99, engine: UNIVER_ENGINE_ID, data: {} })).toBeNull();
  });

  it('rejects a different engine', () => {
    expect(unwrapUniverSnapshot({ schemaVersion: 1, engine: 'other@1', data: {} })).toBeNull();
  });

  it('detects envelopes', () => {
    expect(isSnapshotEnvelope(wrapSnapshot({}))).toBe(true);
    expect(isSnapshotEnvelope({ foo: 'bar' })).toBe(false);
    expect(isSnapshotEnvelope(null)).toBe(false);
  });
});
