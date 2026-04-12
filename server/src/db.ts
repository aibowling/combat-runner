import pg from 'pg';
import fs from 'fs';
import path from 'path';

export function createPool(): pg.Pool {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
}

export async function runMigrations(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('drews_migrations'))");

    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        name text PRIMARY KEY,
        applied_at timestamptz DEFAULT now()
      )
    `);

    const migrationsDir = path.resolve(process.cwd(), 'src', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM migrations_applied WHERE name = $1',
        [file]
      );
      if (rowCount && rowCount > 0) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      await client.query(
        'INSERT INTO migrations_applied (name) VALUES ($1)',
        [file]
      );
      console.log(`Migration applied: ${file}`);
    }

    await client.query("SELECT pg_advisory_unlock(hashtext('drews_migrations'))");
  } finally {
    client.release();
  }
}
