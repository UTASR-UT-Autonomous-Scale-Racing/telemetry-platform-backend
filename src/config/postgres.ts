import { Pool } from 'pg';
import { env } from './env.js';

const pool = new Pool({ connectionString: env.postgresUrl });

export async function initPostgres() {
  const create = `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );`;
  await pool.query(create);
}

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}

export default pool;
