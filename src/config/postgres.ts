import { Pool } from 'pg';
import { env } from './env.js';

const pool = new Pool({ connectionString: env.postgresUrl });

// Prisma is the source of truth for schema. This function is now a connectivity check.
export async function initPostgres() {
  await pool.query('SELECT 1');
}

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}

export default pool;
