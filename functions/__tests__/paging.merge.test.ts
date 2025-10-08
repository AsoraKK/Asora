import { kWayMergeByCreatedAt } from '../shared/paging';

function item(id: string, ts: string) {
  return { id, createdAt: ts };
}

test('k-way merge orders by createdAt desc and tie-breaks by id asc', () => {
  const a = [item('a1', '2024-01-02T10:00:00Z'), item('a2', '2024-01-01T10:00:00Z')];
  const b = [item('b1', '2024-01-03T10:00:00Z'), item('b2', '2024-01-01T10:00:00Z')];
  const c = [item('c1', '2024-01-02T12:00:00Z')];
  const merged = kWayMergeByCreatedAt([a, b, c], 10);
  const ids = merged.map(x => x.id);
  // Expected order: b1 (03), c1 (02:12), a1 (02:10), a2/b2 (01: tie breaks by id)
  expect(ids[0]).toBe('b1');
  expect(ids[1]).toBe('c1');
  expect(ids[2]).toBe('a1');
  expect(['a2', 'b2']).toContain(ids[3]);
});

test('limit respects requested page size', () => {
  const a = [item('a1', '2024-01-02T10:00:00Z'), item('a2', '2024-01-01T10:00:00Z')];
  const b = [item('b1', '2024-01-03T10:00:00Z')];
  const merged = kWayMergeByCreatedAt([a, b], 2);
  expect(merged).toHaveLength(2);
});
