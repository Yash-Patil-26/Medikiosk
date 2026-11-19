import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'medikiosk',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(poolConfig);

async function applySchema() {
  try {
    const schemaPath = join(__dirname, '..', '..', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await pool.query(schema);
    console.log('Schema applied successfully');
  } catch (error) {
    console.error('Error applying schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();
