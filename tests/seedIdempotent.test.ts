import bcrypt from 'bcryptjs';
import '../src/config/env.js';
import { jest } from '@jest/globals';
import { seed } from '../scripts/seed';

// Capture calls to mock query
const calls: { sql: string; params: any[] }[] = [];
let users: any[] = [];

jest.mock('../src/config/postgres.js', () => ({
  query: jest.fn(async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    // Simulate users table behavior for seed script
    if (/SELECT id FROM users WHERE email = \$1 LIMIT 1/i.test(sql)) {
      const email = params[0];
      const user = users.find(u => u.email === email);
      return { rows: user ? [{ id: user.id }] : [], rowCount: user ? 1 : 0 } as any;
    }
    if (/INSERT INTO users/i.test(sql)) {
      const id = users.length + 1;
      const [firstName, lastName, email, passwordHash, role] = params;
      users.push({ id, firstName, lastName, email, passwordHash, role });
      return { rows: [], rowCount: 1 } as any;
    }
    // CREATE TABLE just returns success
    if (/CREATE TABLE IF NOT EXISTS refresh_tokens/i.test(sql)) {
      return { rows: [], rowCount: 0 } as any;
    }
    return { rows: [], rowCount: 0 } as any;
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