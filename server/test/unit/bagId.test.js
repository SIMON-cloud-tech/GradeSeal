// server/test/unit/bagId.test.js
const { listBagIds } = require('../../utils/bagId');

describe('listBagIds', () => {
  it('returns exactly N bag IDs', () => {
    const ids = listBagIds('BAG-0001', 5);
    expect(ids).toHaveLength(5);
  });

  it('zero-pads correctly based on the starting bag length', () => {
    const ids = listBagIds('BAG-0001', 3);
    expect(ids).toEqual(['BAG-0001', 'BAG-0002', 'BAG-0003']);
  });

  it('handles a starting number with more digits', () => {
    const ids = listBagIds('BAG-1001', 4);
    expect(ids).toEqual(['BAG-1001', 'BAG-1002', 'BAG-1003', 'BAG-1004']);
  });

  it('produces no duplicates', () => {
    const ids = listBagIds('BAG-0100', 100);
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it('throws when the starting bag ID has no number', () => {
    expect(() => listBagIds('BAG-', 5)).toThrow();
    expect(() => listBagIds('NONUMBER', 5)).toThrow();
  });

  it('throws when count is zero or negative', () => {
    expect(() => listBagIds('BAG-0001', 0)).toThrow();
    expect(() => listBagIds('BAG-0001', -3)).toThrow();
  });
});