/**
 * Run this script to apply migration SQL files to your Supabase database.
 * Usage: node scripts/apply-migrations.js
 *
 * Requires: `pg` (npm install pg) and valid .env.local with DB password
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  // Get DB password from env or prompt
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error('Set SUPABASE_DB_PASSWORD environment variable or add it to .env.local');
    process.exit(1);
  }

  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

  const client = new Client({
    host: `aws-0-eu-west-2.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${projectRef}`,
    password: dbPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase');

  const files = [
    '../migration-01-new-schema.sql',
    '../migration-02-notification-triggers.sql',
  ];

  for (const file of files) {
    const sqlPath = path.resolve(__dirname, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Applying ${file}...`);

    // Split by semicolons to execute individually
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          console.error(`  Error: ${err.message.substring(0, 100)}`);
        }
      }
    }
    console.log(`  Done`);
  }

  await client.end();
  console.log('Migrations complete');
}

main().catch(console.error);
