import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://agenticauto:your_password@postgres:5432/agenticauto'
});

const db = drizzle(pool, { schema });

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Create all tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role approver_role NOT NULL DEFAULT 'operator',
        email TEXT UNIQUE,
        is_active BOOLEAN DEFAULT true,
        approval_limits JSONB DEFAULT '{"maxRiskScore": 30, "maxServerCount": 5, "environments": ["development"]}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
