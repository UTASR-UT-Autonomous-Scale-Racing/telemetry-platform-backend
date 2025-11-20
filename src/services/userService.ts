import { query } from '../config/postgres.js';

export async function getUsers() {
  const sql = `SELECT id, first_name AS "firstName", last_name AS "lastName", email, created_at AS "createdAt" FROM users ORDER BY id ASC`;
  const result = await query(sql);
  return result.rows;
}
