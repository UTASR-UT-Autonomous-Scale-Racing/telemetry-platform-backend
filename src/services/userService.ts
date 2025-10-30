import { query } from '../config/postgres.js';

export async function getUsers() {
  const res = await query('SELECT id, name, email, created_at FROM users ORDER BY id ASC');
  return res.rows;
}
