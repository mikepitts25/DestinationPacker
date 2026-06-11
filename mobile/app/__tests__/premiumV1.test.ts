import fs from 'fs';
import path from 'path';
import { FREE_TRIP_LIMIT } from '@/constants/config';

const premiumSource = fs.readFileSync(
  path.resolve(__dirname, '../premium.tsx'),
  'utf8',
);

describe('premium v1 readiness', () => {
  it('does not expose purchasable subscription UI before payments are configured', () => {
    expect(premiumSource).not.toContain('$29.99');
    expect(premiumSource).not.toContain('$3.99');
    expect(premiumSource).not.toContain('Start Free Trial');
    expect(premiumSource).not.toContain('Restore Purchases');
  });

  it('does not block trip creation behind unavailable Premium purchases', () => {
    expect(FREE_TRIP_LIMIT).toBe(Number.POSITIVE_INFINITY);
  });
});
