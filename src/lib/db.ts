import { Pool } from 'pg'

const g = global as typeof global & { _pgPool?: Pool }

export const pool = g._pgPool ?? new Pool({
  connectionString: "postgresql://postgres.nphmhvdmlobrbqspsoxi:Fikayotomori%2323@aws-1-eu-west-3.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
  max: 5,
})

if (process.env.NODE_ENV !== 'production') g._pgPool = pool
