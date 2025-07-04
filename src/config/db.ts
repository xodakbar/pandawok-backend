import dns from 'dns';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
