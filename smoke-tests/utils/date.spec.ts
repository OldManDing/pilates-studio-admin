import { formatLocalDateParam } from '@/utils/date';

describe('date utils', () => {
  it('formats API date params from the local calendar day instead of UTC', () => {
    const localEarlyMorning = new Date(2026, 4, 13, 0, 30, 0, 0);

    expect(formatLocalDateParam(localEarlyMorning)).toBe('2026-05-13');
  });
});
