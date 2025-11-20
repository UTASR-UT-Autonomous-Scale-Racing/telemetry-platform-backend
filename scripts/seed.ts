import bcrypt from 'bcryptjs';
import { query } from '../src/config/postgres.js';
import '../src/config/env.js';

export async function seed() {
  console.log('Starting seed...');
  await query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [adminEmail]);
  if ((existing.rowCount || 0) > 0) {
    console.log('Admin user already exists, skipping create.');
  } else {
    const hash = await bcrypt.hash(adminPassword, 10);
    await query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
      ['Admin', 'User', adminEmail, hash, 'ADMIN']
    );
    console.log('Admin user created.');
  }
  console.log('Seed complete.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
