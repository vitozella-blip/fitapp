import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: "postgresql://postgres.nphmhvdmlobrbqspsoxi:Fikayotomori%2323@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false },
  max: 5,
})
