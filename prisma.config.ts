import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: "postgresql://postgres.nphmhvdmlobrbqspsoxi:Fikayotomori%2323@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  },
})