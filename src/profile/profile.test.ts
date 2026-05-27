import { rowToProfile } from './profile';

describe('rowToProfile', () => {
  it('maps a full row', () => {
    const row = { id: 'u1', display_name: 'Ada', created_at: '2026-05-25T00:00:00Z' };
    expect(rowToProfile(row)).toEqual({
      id: 'u1',
      displayName: 'Ada',
      createdAt: '2026-05-25T00:00:00Z',
    });
  });

  it('maps a null display_name to undefined', () => {
    const row = { id: 'u1', display_name: null, created_at: '2026-05-25T00:00:00Z' };
    expect(rowToProfile(row).displayName).toBeUndefined();
  });
});
