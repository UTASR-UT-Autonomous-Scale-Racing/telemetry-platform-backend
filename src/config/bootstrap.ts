import { query } from './postgres.js';

export async function bootstrapSampleData() {
  const res = await query('SELECT count(1) as cnt FROM users');
  const cnt = Number(res.rows?.[0]?.cnt || 0);
  if (cnt === 0) {
    await query('INSERT INTO users(name, email) VALUES($1,$2)', ['Alice', 'alice@example.com']);
  }
}
