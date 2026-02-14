import '../src/config/env.js';
import { jest } from '@jest/globals';
import { seed } from '../scripts/seed';

// Capture calls to mock query
const calls: { sql: string; params: unknown[] }[] = [];
let users: Record<string, unknown>[] = [];

jest.mock('../src/config/postgres.js', () => ({
  query: jest.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    // Simulate users table behavior for seed script
    if (/SELECT id FROM users WHERE email = \$1 LIMIT 1/i.test(sql)) {
      const email = params[0] as string;
      const u = users.find(usr => usr.email === email);
      return { rows: u ? [{ id: u.id }] : [], rowCount: u ? 1 : 0 };
    }
    if (/INSERT INTO users/i.test(sql)) {
      const email = (params as string[])[2];
      users.push({ id: users.length + 1, email });
      return { rows: [], rowCount: 1 };
    }
    // CREATE TABLE just returns success
    return { rows: [], rowCount: 0 };
  })
}));

describe('seed script idempotency', () => {
  beforeEach(() => {
    calls.length = 0;
    users = [];
    jest.resetModules();
  });

  it('creates admin user only once and issues CREATE TABLE each run safely', async () => {
    process.env.SEED_ADMIN_EMAIL = 'admin@example.com';
    process.env.SEED_ADMIN_PASSWORD = 'AdminPass123!';

  // First run
  await seed();
    const firstUserCount = users.length;
    expect(firstUserCount).toBe(1);
    const firstCreateTableCalls = calls.filter(c => /CREATE TABLE IF NOT EXISTS refresh_tokens/i.test(c.sql)).length;
    expect(firstCreateTableCalls).toBe(1);

  // Second run
  await seed();
    const secondUserCount = users.length;
    expect(secondUserCount).toBe(1); // no duplicate admin
    const totalCreateTableCalls = calls.filter(c => /CREATE TABLE IF NOT EXISTS refresh_tokens/i.test(c.sql)).length;
    expect(totalCreateTableCalls).toBe(2); // table statement executed again but safe
  });
});