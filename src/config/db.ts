import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  family: 4, // fuerza IPv4
};

const pool = new Pool(config as any);

export default pool;
