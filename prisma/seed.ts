import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: "postgresql://postgres.nphmhvdmlobrbqspsoxi:Fikayotomori%2323@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const foods = [
  { name: 'Petto di pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Riso bianco cotto', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Pasta di semola cotta', calories: 157, protein: 5.8, carbs: 30.9, fat: 0.9 },
  { name: 'Uovo intero', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: 'Albume uovo', calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: 'Manzo magro', calories: 198, protein: 26, carbs: 0, fat: 10 },
  { name: 'Salmone', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Tonno al naturale', calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Mozzarella', calories: 280, protein: 18, carbs: 3.1, fat: 22 },
  { name: 'Yogurt greco 0%', calories: 57, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: 'Latte intero', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { name: 'Ricotta', calories: 146, protein: 11, carbs: 3, fat: 10 },
  { name: 'Pane integrale', calories: 247, protein: 8.5, carbs: 41, fat: 3.4 },
  { name: 'Pane bianco', calories: 265, protein: 8.9, carbs: 49, fat: 3.2 },
  { name: 'Avena fiocchi', calories: 389, protein: 17, carbs: 66, fat: 7 },
  { name: 'Patate bollite', calories: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: 'Spinaci', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: 'Pomodori', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: 'Zucchine', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { name: 'Carote', calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { name: 'Mela', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Arancia', calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { name: 'Olio di oliva', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: 'Burro di arachidi', calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: 'Mandorle', calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: 'Whey protein', calories: 380, protein: 80, carbs: 7, fat: 4 },
  { name: 'Legumi misti cotti', calories: 116, protein: 7.8, carbs: 20, fat: 0.5 },
  { name: 'Insalata mista', calories: 15, protein: 1.3, carbs: 2.9, fat: 0.2 },
]

async function main() {
  console.log('Seeding...')
  for (const food of foods) {
    await prisma.food.upsert({
      where: { id: food.name.toLowerCase().replace(/ /g, '-') },
      update: {},
      create: { id: food.name.toLowerCase().replace(/ /g, '-'), ...food },
    })
  }
  console.log(`✓ ${foods.length} alimenti inseriti`)
}

main().catch(console.error).finally(() => prisma.$disconnect())