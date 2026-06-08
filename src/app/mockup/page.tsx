'use client'
import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Check, Minus, X,
  Apple, ShoppingCart, ChefHat, Target, CalendarDays, BookOpen, Dumbbell, TrendingUp, History, Scale,
  Plus, Timer, Link2, Flame,
  Star, ScanBarcode, Search, ChevronDown, Pencil, Trash2,
} from 'lucide-react'
import { MealIcon, TennisBall } from '@/components/shared/icons'

// ── Neutri ──────────────────────────────────────────────────────────────
const BG = '#0d1117', CARD = '#161c26', CARD2 = '#1d2530'
const TXT = '#e6edf3', DIM = '#8b949e', FAINT = '#5c6672'
const SHADOW = '0 4px 16px rgba(0,0,0,0.35)'

const FOOD = '#e8924a', TRAIN = '#5b9ec9'
const M = {
  kcal:    { c: '#6abf6a', label: 'Calorie' },
  fat:     { c: '#5b9bd5', label: 'Grassi' },
  carbs:   { c: '#e0a06a', label: 'Carboidrati' },
  protein: { c: '#9d8fcc', label: 'Proteine' },
}
const GYM = TRAIN, TENNIS = '#6aaa6a', C_WARM = '#f0aa78'

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ height: 6, background: '#ffffff14', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  )
}
function Dot({ c }: { c: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
}
function MacroLegend() {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {Object.values(M).map(x => (
        <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dot c={x.c} /><span style={{ fontSize: 12, color: DIM }}>{x.label}</span>
        </div>
      ))}
    </div>
  )
}
// Macro con pallino + unità "g"
function MacroRows({ data }: { data: { k: keyof typeof M; v: number; m: number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      {data.map(x => (
        <div key={x.k}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <Dot c={M[x.k].c} />
            <span style={{ fontSize: 12, color: TXT, fontWeight: 600 }}>{x.v}<span style={{ color: FAINT }}>/{x.m} g</span></span>
          </div>
          <Bar value={x.v} max={x.m} color={M[x.k].c} />
        </div>
      ))}
    </div>
  )
}

// ── Navigazione giorni (funzionante) ────────────────────────────────────
function DayNav({ date, setDate, accent }: { date: Date; setDate: (d: Date) => void; accent: string }) {
  const shift = (n: number) => { const d = new Date(date); d.setDate(d.getDate() + n); setDate(d) }
  const label = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const isToday = date.toDateString() === new Date().toDateString()
  const btn = { width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ flex: 1, height: 40, borderRadius: 14, background: CARD, display: 'flex', alignItems: 'center', boxShadow: SHADOW }}>
        <button style={btn} onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{label}</span>
        <button style={btn} onClick={() => shift(1)}><ChevronRight size={18} /></button>
      </div>
      <button style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', background: CARD, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW }}>
        <Calendar size={17} />
      </button>
      <button onClick={() => setDate(new Date())} disabled={isToday}
        style={{ height: 40, padding: '0 14px', borderRadius: 12, border: 'none', cursor: isToday ? 'default' : 'pointer', fontWeight: 700, fontSize: 13,
          background: isToday ? CARD : accent, color: isToday ? FAINT : '#fff', boxShadow: SHADOW }}>
        Oggi
      </button>
    </div>
  )
}

// ── Tab periodo ─────────────────────────────────────────────────────────
function PeriodTabs({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const opts = [['sett', 'Sett.'], ['mese', 'Mese'], ['prec', 'Prec.'], ['custom', 'Custom']]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(([k, lbl]) => (
        <button key={k} onClick={() => onChange(k)}
          style={{ flex: 1, padding: '7px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: value === k ? accent : CARD2, color: value === k ? '#fff' : DIM }}>
          {lbl}
        </button>
      ))}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <span style={{ fontSize: 14, color: DIM, fontWeight: 600 }}>{children}</span>
      <ChevronRight size={16} color={DIM} />
    </div>
  )
}

export default function MockupPage() {
  const [view, setView] = useState<'dash' | 'food' | 'train' | 'fdiary' | 'diary' | 'fdb' | 'fmacros' | 'fplan' | 'frecipes' | 'fshopping'>('fdiary')
  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: BG, padding: '12px 16px',
        display: 'flex', gap: 6, borderBottom: '1px solid #ffffff10', overflowX: 'auto' }}>
        {([
          ['dash', 'Dashboard'], ['food', 'Aliment.'], ['train', 'Allen.'],
          ['fdiary', 'Diario P.'], ['diary', 'Diario WO'],
          ['fdb', 'DB Alim.'], ['fmacros', 'Macro'], ['fplan', 'Piano'],
          ['frecipes', 'Ricette'], ['fshopping', 'Spesa'],
        ] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ flex: '1 0 auto', padding: '9px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
              background: view === k ? (k === 'train' || k === 'diary' ? TRAIN : k === 'dash' ? '#30363d' : FOOD) : CARD,
              color: view === k ? '#fff' : DIM }}>
            {lbl}
          </button>
        ))}
      </div>
      {view === 'dash'      && <Dash />}
      {view === 'food'      && <Food />}
      {view === 'train'     && <Train />}
      {view === 'fdiary'    && <FoodDiary />}
      {view === 'diary'     && <Diary />}
      {view === 'fdb'       && <FoodDatabase />}
      {view === 'fmacros'   && <FoodMacros />}
      {view === 'fplan'     && <FoodPlan />}
      {view === 'frecipes'  && <FoodRecipes />}
      {view === 'fshopping' && <FoodShopping />}
    </div>
  )
}

// ════════════════════════════════════ DASHBOARD ═══════════════════════════
function Dash() {
  const [date, setDate] = useState(new Date())
  const meals = [
    { name: 'Colazione', short: 'Col.', kcal: 238, fat: 1, carbs: 47, protein: 10 },
    { name: 'Spuntino mattina', short: 'Mat.', kcal: 180, fat: 5, carbs: 10, protein: 22 },
    { name: 'Pranzo', short: 'Pra.', kcal: 0, fat: 0, carbs: 0, protein: 0 },
    { name: 'Spuntino pomeriggio', short: 'Pom.', kcal: 0, fat: 0, carbs: 0, protein: 0 },
    { name: 'Cena', short: 'Cen.', kcal: 0, fat: 0, carbs: 0, protein: 0 },
  ]
  const week = [
    { d: 'L', act: 'gym' }, { d: 'M', act: 'tennis' }, { d: 'M', act: 'gym' },
    { d: 'G', act: 'tennis' }, { d: 'V', act: null }, { d: 'S', act: null, today: true }, { d: 'D', act: null },
  ] as const
  const doneExercises = [
    { name: 'Panca piana', st: 'done' }, { name: 'Spinte manubri', st: 'done' },
    { name: 'Croci ai cavi', st: 'partial' }, { name: 'Rematore', st: 'done' },
    { name: 'Lat machine', st: 'skipped' }, { name: 'Curl bilanciere', st: 'done' },
  ]
  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DayNav date={date} setDate={setDate} accent={M.kcal.c} />

      {/* Macro */}
      <div style={{ background: CARD, borderRadius: 20, padding: 20, boxShadow: SHADOW, borderTop: '3px solid #4d5663' }}>
        {/* Titolo */}
        <p style={{ margin: 0, fontSize: 14, color: DIM, fontWeight: 600 }}>Macro</p>
        {/* Legenda tra titolo e numero */}
        <div style={{ marginTop: 10, marginBottom: 14 }}><MacroLegend /></div>
        {/* Numero calorie (senza etichetta "Calorie") */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: -1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot c={M.kcal.c} />
            <span>418 <span style={{ fontSize: 16, fontWeight: 500, color: FAINT }}>/ 2460 kcal</span></span>
          </p>
          <span style={{ fontSize: 22, fontWeight: 800, color: M.kcal.c }}>17%</span>
        </div>
        <Bar value={418} max={2460} color={M.kcal.c} />
        {/* Quanto ti resta */}
        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 12, background: M.kcal.c + '1f',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: DIM }}>Ti restano</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: M.kcal.c }}>2042<span style={{ fontSize: 11, fontWeight: 500, color: FAINT }}> kcal</span></span>
            <span style={{ color: FAINT }}>·</span>
            <span style={{ fontSize: 13, color: M.fat.c }}>54<span style={{ fontSize: 10, color: FAINT }}>g</span></span>
            <span style={{ color: FAINT }}>/</span>
            <span style={{ fontSize: 13, color: M.carbs.c }}>273<span style={{ fontSize: 10, color: FAINT }}>g</span></span>
            <span style={{ color: FAINT }}>/</span>
            <span style={{ fontSize: 13, color: M.protein.c }}>118<span style={{ fontSize: 10, color: FAINT }}>g</span></span>
          </span>
        </div>
        <div style={{ marginTop: 14 }}>
          <MacroRows data={[{ k: 'fat', v: 6, m: 60 }, { k: 'carbs', v: 57, m: 330 }, { k: 'protein', v: 32, m: 150 }]} />
        </div>
      </div>

      {/* Pasti — pallini colorati per macro */}
      <div style={{ background: CARD, borderRadius: 20, padding: 18, boxShadow: SHADOW, borderTop: `3px solid ${FOOD}` }}>
        <CardTitle>Pasti</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {meals.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: CARD2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MealIcon name={m.name} size={18} color={m.kcal ? FOOD : FAINT} />
              </div>
              {m.kcal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 800, color: TXT }}>
                    <Dot c={M.kcal.c} />{m.kcal}
                  </span>
                  {([['fat', m.fat], ['carbs', m.carbs], ['protein', m.protein]] as const).map(([k, v]) => (
                    <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 500, color: TXT }}>
                      <Dot c={M[k].c} />{v}
                    </span>
                  ))}
                </div>
              ) : <span style={{ fontSize: 13, color: FAINT }}>–</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Allenamento — settimana + lista esercizi completati */}
      <div style={{ background: CARD, borderRadius: 20, padding: 18, boxShadow: SHADOW, borderTop: `3px solid ${TRAIN}` }}>
        <CardTitle>Allenamento</CardTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          {week.map((x, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'today' in x && x.today ? TRAIN : FAINT, fontWeight: 'today' in x && x.today ? 800 : 500 }}>{x.d}</span>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: x.act === 'gym' ? GYM : x.act === 'tennis' ? TENNIS : 'transparent',
                border: x.act ? 'none' : `1.5px solid ${'today' in x && x.today ? TRAIN : '#ffffff20'}` }}>
                {x.act === 'gym' && <Dumbbell size={13} color="#fff" />}
                {x.act === 'tennis' && <TennisBall size={14} color="#fff" strokeWidth={2} />}
              </div>
            </div>
          ))}
        </div>
        {/* OPZIONI giorno con palestra + tennis insieme */}
        <div style={{ background: CARD2, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: DIM }}>Giorno con <b style={{ color: TXT }}>palestra + tennis</b> — opzioni:</p>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            {/* A — cerchio diviso a metà */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, ${GYM} 0 50%, ${TENNIS} 50% 100%)` }} />
              <span style={{ fontSize: 11, color: DIM }}>A · diviso</span>
            </div>
            {/* B — due cerchietti affiancati */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: GYM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dumbbell size={9} color="#fff" /></span>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: TENNIS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TennisBall size={10} color="#fff" strokeWidth={2.4} /></span>
              </div>
              <span style={{ fontSize: 11, color: DIM }}>B · due</span>
            </div>
            {/* C — anello verde + manubrio dentro */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: GYM, border: `2.5px solid ${TENNIS}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dumbbell size={13} color="#fff" /></div>
              <span style={{ fontSize: 11, color: DIM }}>C · anello</span>
            </div>
            {/* D — cerchio diviso con icone */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, ${GYM} 0 50%, ${TENNIS} 50% 100%)` }}>
                <Dumbbell size={9} color="#fff" style={{ position: 'absolute', top: 4, left: 3 }} />
                <span style={{ position: 'absolute', bottom: 3, right: 2 }}><TennisBall size={10} color="#fff" strokeWidth={2.4} /></span>
              </div>
              <span style={{ fontSize: 11, color: DIM }}>D · diviso+icone</span>
            </div>
          </div>
        </div>

        {/* Lista esercizi completati */}
        <div style={{ background: CARD2, borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Dumbbell size={15} color={GYM} /><span style={{ fontSize: 13, fontWeight: 700, color: GYM }}>WORKOUT 1 — CHEST + BACK</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
            {doneExercises.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {e.st === 'done' && <Check size={12} color="#7dbf7d" />}
                {e.st === 'partial' && <Minus size={12} color="#f0aa78" />}
                {e.st === 'skipped' && <X size={12} color="#94a3b8" />}
                <span style={{ fontSize: 12, color: DIM }}>{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

// ════════════════════════════════════ ALIMENTAZIONE ═══════════════════════
function Food() {
  const [period, setPeriod] = useState('mese')
  const tiles = [
    { Icon: BookOpen, label: 'Diario Pasti', big: true },
    { Icon: Apple, label: 'Alimenti' }, { Icon: ShoppingCart, label: 'Lista Spesa' },
    { Icon: ChefHat, label: 'Ricette' }, { Icon: Target, label: 'Completa Macro' },
    { Icon: CalendarDays, label: 'Piano Alimentare' },
  ]
  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: FOOD + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Apple size={22} color={FOOD} /></div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Alimentazione</h1>
      </div>
      <PeriodTabs value={period} onChange={setPeriod} accent={FOOD} />

      <div style={{ background: CARD, borderRadius: 20, padding: 20, boxShadow: SHADOW, borderTop: `3px solid ${FOOD}` }}>
        <p style={{ margin: 0, fontSize: 12, color: DIM }}>Media giornaliera</p>
        <p style={{ margin: '4px 0 12px', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
          1870 <span style={{ fontSize: 15, fontWeight: 500, color: FAINT }}>/ 2460 kcal</span>
        </p>
        <Bar value={1870} max={2460} color={M.kcal.c} />
        <div style={{ marginTop: 18 }}>
          <MacroRows data={[{ k: 'fat', v: 35, m: 60 }, { k: 'carbs', v: 264, m: 330 }, { k: 'protein', v: 118, m: 150 }]} />
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #ffffff10' }}><MacroLegend /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {tiles.map((t, i) => (
          <div key={i} style={{ gridColumn: t.big ? 'span 2' : 'span 1', background: CARD, borderRadius: 16, padding: 16, boxShadow: SHADOW,
            display: 'flex', alignItems: 'center', gap: 12, justifyContent: t.big ? 'center' : 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: FOOD + '1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><t.Icon size={19} color={FOOD} strokeWidth={1.8} /></div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════ ALLENAMENTO ═════════════════════════
// Schede con sigla + colore distinto
const SCHEDA = {
  CB: { label: 'CB', name: 'Chest + Back',     color: '#5b9ec9' },
  L:  { label: 'L',  name: 'Legs',             color: '#9d8fcc' },
  SM: { label: 'SM', name: 'Shoulders + Mix',  color: '#5fb3a3' },
} as const
type SK = keyof typeof SCHEDA
// Badge sigla colorata
function SchedaBadge({ k, size = 22 }: { k: SK; size?: number }) {
  const s = SCHEDA[k]
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: s.color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 800, flexShrink: 0 }}>
      {s.label}
    </span>
  )
}

function Train() {
  const [period, setPeriod] = useState('mese')
  const cols: { head: 'tennis' | SK; dates: string[] }[] = [
    { head: 'tennis', dates: ['Mar 5', 'Mar 12', 'Mar 19', 'Mar 26'] },
    { head: 'CB', dates: ['Lun 4', 'Lun 11', 'Lun 18', 'Lun 25'] },
    { head: 'L',  dates: ['Mer 6', 'Mer 13', 'Mer 20'] },
    { head: 'SM', dates: ['Gio 21', 'Gio 28'] },
  ]
  // Mese di esempio: mappa giorno → tipo allenamento
  const dayMap: Record<number, 'tennis' | SK> = {
    4: 'CB', 5: 'tennis', 6: 'L', 11: 'CB', 12: 'tennis', 13: 'L', 18: 'CB', 19: 'tennis', 20: 'L', 21: 'SM', 25: 'CB', 26: 'tennis', 28: 'SM',
  }
  const tiles = [
    { Icon: Dumbbell, label: 'Diario Allenamenti', big: true },
    { Icon: TrendingUp, label: 'Progressi' }, { Icon: History, label: 'Storico' },
    { Icon: Scale, label: 'Peso' }, { Icon: BookOpen, label: 'Piano Allenamento' },
  ]
  const headFor = (h: 'tennis' | SK) => h === 'tennis'
    ? <span style={{ width: 22, height: 22, borderRadius: '50%', background: TENNIS, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><TennisBall size={13} color="#fff" strokeWidth={2} /></span>
    : <SchedaBadge k={h} />
  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: TRAIN + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dumbbell size={22} color={TRAIN} /></div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Allenamento</h1>
      </div>
      <PeriodTabs value={period} onChange={setPeriod} accent={TRAIN} />

      {/* Riepilogo + sessioni svolte nel periodo */}
      <div style={{ background: CARD, borderRadius: 20, padding: 18, boxShadow: SHADOW, borderTop: `3px solid ${TRAIN}` }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: GYM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dumbbell size={17} color="#fff" /></span>
            <div><p style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>6</p><p style={{ margin: '2px 0 0', fontSize: 11, color: DIM }}>Palestra</p></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: TENNIS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TennisBall size={18} color="#fff" strokeWidth={2} /></span>
            <div><p style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>8</p><p style={{ margin: '2px 0 0', fontSize: 11, color: DIM }}>Tennis</p></div>
          </div>
        </div>
        {/* Legenda schede */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #ffffff10', paddingTop: 12, marginBottom: 14 }}>
          {(Object.keys(SCHEDA) as SK[]).map(k => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SchedaBadge k={k} size={18} />
              <span style={{ fontSize: 11, color: DIM }}>{SCHEDA[k].name}</span>
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: TENNIS, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><TennisBall size={11} color="#fff" strokeWidth={2} /></span>
            <span style={{ fontSize: 11, color: DIM }}>Tennis</span>
          </span>
        </div>
        {/* Sessioni svolte per scheda */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
          {cols.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>{headFor(c.head)}</div>
              {c.dates.map(d => (
                <span key={d} style={{ fontSize: 11, color: DIM }}>{d} Mag</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Calendario mensile — sigla colorata per ogni giorno allenato */}
      <div style={{ background: CARD, borderRadius: 20, padding: 16, boxShadow: SHADOW, borderTop: `3px solid ${TRAIN}` }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: DIM }}>Maggio — calendario</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {['L','M','M','G','V','S','D'].map((d, i) => (
            <span key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: FAINT }}>{d}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
            const act = dayMap[day]
            const bg = act === 'tennis' ? TENNIS : act ? SCHEDA[act].color : null
            return (
              <div key={day} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {bg ? (
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                    {day}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: FAINT }}>{day}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {tiles.map((t, i) => (
          <div key={i} style={{ gridColumn: t.big ? 'span 2' : 'span 1', background: CARD, borderRadius: 16, padding: 16, boxShadow: SHADOW,
            display: 'flex', alignItems: 'center', gap: 12, justifyContent: t.big ? 'center' : 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: TRAIN + '1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><t.Icon size={19} color={TRAIN} strokeWidth={1.8} /></div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════ DIARIO PASTI ════════════════════════
function FoodDiary() {
  const [date, setDate] = useState(new Date())
  const [expandedMeal, setExpandedMeal] = useState<number | null>(0)
  const [freeMeals, setFreeMeals] = useState<Set<number>>(new Set())

  type FoodItem = { name: string; qty: string; kcal: number; protein: number; carbs: number; fat: number }
  const MEALS: { name: string; kcal: number; protein: number; carbs: number; fat: number; items: FoodItem[] }[] = [
    { name: 'Colazione', kcal: 420, protein: 30, carbs: 55, fat: 12, items: [
      { name: 'Latte intero',    qty: '250ml', kcal: 155, protein:  8, carbs: 12, fat:  9 },
      { name: "Fiocchi d'avena", qty: '80g',   kcal: 296, protein: 10, carbs: 55, fat:  6 },
      { name: 'Mirtilli',        qty: '100g',  kcal:  57, protein:  1, carbs: 14, fat:  0 },
    ]},
    { name: 'Spuntino mattina', kcal: 180, protein: 22, carbs: 5, fat: 7, items: [
      { name: 'Yogurt greco', qty: '150g', kcal:  95, protein: 17, carbs: 4, fat:  1 },
      { name: 'Mandorle',     qty: '20g',  kcal: 122, protein:  4, carbs: 2, fat: 11 },
    ]},
    { name: 'Pranzo', kcal: 680, protein: 45, carbs: 75, fat: 18, items: [
      { name: 'Riso integrale', qty: '100g', kcal: 370, protein:  8, carbs: 77, fat:  3 },
      { name: 'Pollo arrosto',  qty: '200g', kcal: 294, protein: 56, carbs:  0, fat:  8 },
      { name: 'Olio EVO',       qty: '10g',  kcal:  88, protein:  0, carbs:  0, fat: 10 },
    ]},
    { name: 'Spuntino pomeriggio', kcal: 0, protein: 0, carbs: 0, fat: 0, items: [] },
    { name: 'Cena',                kcal: 0, protein: 0, carbs: 0, fat: 0, items: [] },
  ]

  const total = MEALS.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
  const targets = { kcal: 2460, protein: 150, carbs: 330, fat: 60 }

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <DayNav date={date} setDate={setDate} accent={FOOD} />

      {/* Macro card */}
      <div style={{ background: CARD, borderRadius: 20, padding: 16, boxShadow: SHADOW, borderTop: `3px solid ${FOOD}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, lineHeight: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot c={M.kcal.c} />
            <span>{total.kcal} <span style={{ fontSize: 14, fontWeight: 500, color: FAINT }}>/ {targets.kcal} kcal</span></span>
          </p>
          <span style={{ fontSize: 18, fontWeight: 800, color: M.kcal.c }}>{Math.round(total.kcal / targets.kcal * 100)}%</span>
        </div>
        <Bar value={total.kcal} max={targets.kcal} color={M.kcal.c} />
        {/* Macro bars */}
        <div style={{ marginTop: 14 }}>
          <MacroRows data={[
            { k: 'fat',     v: total.fat,     m: targets.fat },
            { k: 'carbs',   v: total.carbs,   m: targets.carbs },
            { k: 'protein', v: total.protein, m: targets.protein },
          ]} />
        </div>
        {/* Ti restano */}
        <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 11, background: M.kcal.c + '1a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: DIM }}>Ti restano</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: M.kcal.c }}>
              {targets.kcal - total.kcal}<span style={{ fontSize: 10, fontWeight: 500, color: FAINT }}> kcal</span>
            </span>
            <span style={{ color: FAINT }}>·</span>
            <span style={{ fontSize: 12, color: M.fat.c }}>{targets.fat - total.fat}<span style={{ fontSize: 10, color: FAINT }}>g</span></span>
            <span style={{ color: FAINT }}>/</span>
            <span style={{ fontSize: 12, color: M.carbs.c }}>{targets.carbs - total.carbs}<span style={{ fontSize: 10, color: FAINT }}>g</span></span>
            <span style={{ color: FAINT }}>/</span>
            <span style={{ fontSize: 12, color: M.protein.c }}>{targets.protein - total.protein}<span style={{ fontSize: 10, color: FAINT }}>g</span></span>
          </span>
        </div>
      </div>

      {/* Sezioni pasto */}
      {MEALS.map((meal, i) => {
        const isOpen = expandedMeal === i
        const hasMacros = meal.kcal > 0
        const isFree = freeMeals.has(i)
        return (
          <div key={i} style={{ background: CARD, borderRadius: 16, overflow: 'hidden', boxShadow: SHADOW,
            borderLeft: `3px solid ${hasMacros ? FOOD : '#ffffff14'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
              onClick={() => setExpandedMeal(isOpen ? null : i)}>
              <MealIcon name={meal.name} size={18} color={hasMacros ? FOOD : FAINT} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{meal.name}</p>
                {hasMacros && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: M.kcal.c, fontWeight: 700 }}>{meal.kcal}</span>
                    <span style={{ color: FAINT }}>·</span>
                    <span style={{ color: M.fat.c }}>{meal.fat}</span>
                    <span style={{ color: FAINT }}>·</span>
                    <span style={{ color: M.carbs.c }}>{meal.carbs}</span>
                    <span style={{ color: FAINT }}>·</span>
                    <span style={{ color: M.protein.c }}>{meal.protein}</span>
                  </p>
                )}
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid #ffffff0a' }}>
                {/* Pasto libero + Copia ieri per questo pasto */}
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px' }}>
                  <button onClick={(e) => { e.stopPropagation(); setFreeMeals(s => { const n = new Set(s); isFree ? n.delete(i) : n.add(i); return n }) }}
                    style={{ flex: 1, padding: '8px', borderRadius: 12,
                      border: `1.5px solid ${isFree ? FOOD : FOOD + '40'}`,
                      background: isFree ? FOOD + '20' : 'transparent',
                      color: FOOD, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {isFree ? '✓ ' : ''}Pasto libero
                  </button>
                  <button style={{ flex: 1, padding: '8px', borderRadius: 12,
                    border: '1px solid #ffffff14', background: CARD2, color: DIM,
                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <History size={13} /> Copia ieri
                  </button>
                </div>
                {meal.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px',
                    borderBottom: '1px solid #ffffff08' }}>
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: M.carbs.c + '80', marginRight: 10, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: TXT }}>{item.name}</span>
                      <span style={{ fontSize: 12, color: FAINT }}> {item.qty}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 8px 14px 8px 18px 8px 18px',
                      alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: M.kcal.c, fontWeight: 600, textAlign: 'right' }}>{item.kcal}</span>
                      <span style={{ color: FAINT, fontSize: 10, textAlign: 'center' }}>·</span>
                      <span style={{ fontSize: 12, color: M.fat.c, textAlign: 'right' }}>{item.fat}</span>
                      <span style={{ color: FAINT, fontSize: 10, textAlign: 'center' }}>·</span>
                      <span style={{ fontSize: 12, color: M.carbs.c, textAlign: 'right' }}>{item.carbs}</span>
                      <span style={{ color: FAINT, fontSize: 10, textAlign: 'center' }}>·</span>
                      <span style={{ fontSize: 12, color: M.protein.c, textAlign: 'right' }}>{item.protein}</span>
                    </div>
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: '#e05555' + '80', marginLeft: 10, flexShrink: 0 }} />
                  </div>
                ))}
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} color={FOOD} />
                  <span style={{ fontSize: 13, color: FOOD, fontWeight: 600 }}>Aggiungi alimento</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════ DIARIO ALLENAMENTI ══════════════════
function Diary() {
  const [date, setDate] = useState(new Date())
  const [open, setOpen] = useState<number | null>(0)
  const [tag, setTag] = useState('')
  const [timerOn, setTimerOn] = useState(false)
  const TAGS = ['SS', 'JS', 'MR', 'WD', 'D', 'S', 'TS', 'BO']

  const ex = [
    { name: 'Panca piana',         nSets: 4, reps: '8',  rec: '90s', st: 'done',
      warm: [{ l: 'R1', v: '20×12' }, { l: 'R2', v: '40×10' }],
      sets: [{ l: 'S1', v: '60×8' }, { l: 'S2', v: '60×8' }, { l: 'S3', v: '62×6' }, { l: 'S4', v: '62×6' }],
      pair: null, noteS: true, noteP: false },
    { name: 'Spinte manubri',      nSets: 3, reps: '10', rec: '75s', st: 'done',
      warm: [{ l: 'R1', v: '12×12' }],
      sets: [{ l: 'S1', v: '24×10' }, { l: 'S2', v: '24×9' }, { l: 'S3', v: '24×8' }],
      pair: 'SS', noteS: false, noteP: true },
    { name: 'Croci ai cavi',       nSets: 3, reps: '12', rec: '60s', st: 'partial',
      warm: [],
      sets: [{ l: 'S1', v: '15×12' }, { l: 'S2', v: '15×10' }],
      pair: 'SS', noteS: false, noteP: false },
    { name: 'Lat machine',         nSets: 4, reps: '10', rec: '90s', st: null, warm: [], sets: [], pair: null, noteS: false, noteP: false },
    { name: 'Rematore bilanciere', nSets: 4, reps: '8',  rec: '90s', st: null, warm: [], sets: [], pair: null, noteS: false, noteP: false },
  ]

  const statusStyle = (st: string | null) =>
    st === 'done'    ? { bg: '#7dbf7d', icon: <Check  size={13} color="#fff" /> }
    : st === 'partial' ? { bg: '#f0aa78', icon: <Minus  size={13} color="#fff" /> }
    : { bg: 'transparent', icon: null }

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <DayNav date={date} setDate={setDate} accent="#ffffff" />

      {/* Recovery timer chip */}
      {timerOn && (
        <div style={{ background: TRAIN + '20', border: `1px solid ${TRAIN}50`, borderRadius: 14,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Timer size={16} color={TRAIN} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: TRAIN }}>Recupero · 01:22</span>
          <span style={{ fontSize: 11, color: DIM }}>S3 Panca piana</span>
          <button onClick={() => setTimerOn(false)}
            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: '#ffffff14',
              color: DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Tennis card */}
      <div style={{ background: CARD, borderRadius: 16, padding: '10px 14px', boxShadow: SHADOW,
        display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${TENNIS}` }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: TENNIS,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TennisBall size={16} color="#fff" strokeWidth={2} />
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Tennis</p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: DIM }}>allenamento · 1.5h</p>
        </div>
      </div>

      {/* Scheda card */}
      <div style={{ background: CARD, borderRadius: 20, boxShadow: SHADOW,
        border: '1px solid #ffffff14', borderTop: `3px solid ${TRAIN}`, overflow: 'hidden' }}>
        {/* Header scheda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #ffffff10' }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: TRAIN, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, flexShrink: 0 }}>CB</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: TRAIN }}>WORKOUT 1 — CHEST + BACK</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: DIM, flexShrink: 0 }}>W-6</span>
        </div>

        {/* Exercises */}
        {ex.map((e, i) => {
          const s = statusStyle(e.st)
          const isOpen = open === i
          const hasData = e.warm.length > 0 || e.sets.length > 0
          return (
            <div key={i} style={{ borderBottom: i < ex.length - 1 ? '1px solid #ffffff0a' : 'none',
              background: isOpen ? '#ffffff08' : 'transparent' }}>
              {e.pair && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 16px 0' }}>
                  <Link2 size={10} color={TRAIN} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: TRAIN }}>{e.pair}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setOpen(isOpen ? null : i)}>
                <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.bg, border: e.st ? 'none' : '1.5px solid #ffffff30' }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{e.name}</p>
                  {hasData
                    ? <p style={{ margin: '1px 0 0', fontSize: 10, color: TRAIN }}>{e.sets.length + e.warm.length} eseguiti</p>
                    : <p style={{ margin: '1px 0 0', fontSize: 11, color: FAINT }}>{e.nSets}×{e.reps} · rec {e.rec}</p>}
                </div>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: TRAIN + '1e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={15} color={TRAIN} />
                </span>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid #ffffff0a' }}>
                  {/* Stats row: SET · REP · REC */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 16px 8px' }}>
                    {([['Set', String(e.nSets)], ['Rep', e.reps], ['Rec', e.rec]] as const).map(([label, val], li) => (
                      <div key={li} style={{ textAlign: 'center',
                        borderLeft: li > 0 ? '1px solid #ffffff10' : 'none' }}>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: TRAIN }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {/* Action icons: note scheda | note personali | timer | storico */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    borderTop: '1px solid #ffffff0a', borderBottom: '1px solid #ffffff0a' }}>
                    {([
                      { icon: <BookOpen size={15} />, active: e.noteS,  color: '#f0aa78' },
                      { icon: <BookOpen size={15} />, active: e.noteP,  color: '#9d8fcc' },
                      { icon: <Timer    size={15} />, active: timerOn,  color: TRAIN,     action: () => setTimerOn(t => !t) },
                      { icon: <History  size={15} />, active: false,    color: TRAIN },
                    ] as { icon: React.ReactNode; active: boolean; color: string; action?: () => void }[]).map((btn, bi) => (
                      <button key={bi} onClick={btn.action}
                        style={{ padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer',
                          borderLeft: bi > 0 ? '1px solid #ffffff0a' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: btn.active ? btn.color : FAINT }}>
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Set chips */}
                    {hasData && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {e.warm.map((ws, j) => (
                          <span key={'w'+j} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: CARD2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C_WARM }}>{ws.l}</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{ws.v}</span>
                          </span>
                        ))}
                        {e.sets.map((ws, j) => (
                          <span key={'s'+j} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: CARD2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: TRAIN }}>{ws.l}</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{ws.v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Tag selector */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: FAINT }}>Tag:</span>
                      {TAGS.map(t => (
                        <button key={t} onClick={() => setTag(tag === t ? '' : t)}
                          style={{ padding: '3px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            background: tag === t ? TRAIN : CARD2, color: tag === t ? '#fff' : DIM }}>{t}</button>
                      ))}
                    </div>
                    {/* Add set form */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input placeholder="reps" style={{ width: 52, padding: '8px 4px', borderRadius: 9,
                        border: '1px solid #ffffff14', background: CARD2, color: TXT, fontSize: 13, textAlign: 'center', outline: 'none' }} />
                      <span style={{ color: FAINT }}>×</span>
                      <input placeholder="kg" style={{ width: 52, padding: '8px 4px', borderRadius: 9,
                        border: '1px solid #ffffff14', background: CARD2, color: TXT, fontSize: 13, textAlign: 'center', outline: 'none' }} />
                      <button style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C_WARM}50`,
                        background: C_WARM + '1e', color: C_WARM, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Flame size={15} />
                      </button>
                      <button onClick={() => setTimerOn(true)}
                        style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                          background: TRAIN, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        + Serie
                      </button>
                    </div>
                    {/* History comparison */}
                    <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 8, padding: '9px', borderRadius: 10, border: `1px solid ${TRAIN}40`,
                      background: TRAIN + '14', color: TRAIN, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <History size={15} /> Confronta con sessioni precedenti
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════ DATABASE ALIMENTI ═══════════════════════════
function FoodDatabase() {
  const [expandedId, setExpandedId] = useState<number | null>(2)
  const [favOnly, setFavOnly] = useState(false)
  const foods = [
    { id: 1, name: 'Riso Parboiled',   brand: 'Lidl',    kcal: 350, fat: 1.0, carbs: 76, protein: 7,  cats: ['Carboidrati'], fav: false },
    { id: 2, name: 'Petto di Pollo',   brand: 'Generico',kcal: 165, fat: 3.6, carbs: 0,  protein: 31, cats: ['Proteine'],    fav: true  },
    { id: 3, name: 'Fiocchi di Avena', brand: 'Quaker',  kcal: 389, fat: 7,   carbs: 66, protein: 17, cats: ['Carboidrati'], fav: false },
    { id: 4, name: 'Olio EVO',         brand: 'Monini',  kcal: 884, fat: 100, carbs: 0,  protein: 0,  cats: ['Grassi'],      fav: false },
    { id: 5, name: 'Uova intere',      brand: 'Generico',kcal: 147, fat: 10,  carbs: 1,  protein: 13, cats: ['Proteine'],    fav: false },
  ]
  const P = { padding: 16, display: 'flex' as const, flexDirection: 'column' as const, gap: 12 }
  return (
    <div style={P}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Apple size={22} color={FOOD} />
        <span style={{ fontSize: 20, fontWeight: 800 }}>Alimenti</span>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', background: FOOD, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={14} /> Nuovo
        </button>
      </div>
      {/* Search + barcode */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: CARD, borderRadius: 14, padding: '0 14px', height: 44 }}>
          <Search size={15} color={DIM} /><span style={{ fontSize: 13, color: FAINT }}>Cerca per nome o marca...</span>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ScanBarcode size={18} color={FOOD} />
        </div>
      </div>
      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 40, borderRadius: 12, background: CARD }}>
          <span style={{ fontSize: 12, color: FAINT }}>Tutte le categorie</span>
          <ChevronDown size={13} color={FAINT} />
        </div>
        <button onClick={() => setFavOnly(f => !f)}
          style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: favOnly ? '#daa52025' : CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <Star size={15} color={favOnly ? '#daa520' : FAINT} fill={favOnly ? '#daa520' : 'none'} />
        </button>
      </div>
      {/* Food list */}
      <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
        {foods.map((food, i) => (
          <div key={food.id} style={{ borderBottom: i < foods.length - 1 ? `1px solid ${CARD2}` : 'none' }}>
            <div onClick={() => setExpandedId(expandedId === food.id ? null : food.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT }}>{food.name}</div>
                {food.brand !== 'Generico' && <div style={{ fontSize: 11, color: DIM, marginTop: 1 }}>{food.brand}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: M.kcal.c, fontWeight: 700 }}>{food.kcal} kcal</span>
                  <span style={{ fontSize: 12, color: M.fat.c }}>G {food.fat}g</span>
                  <span style={{ fontSize: 12, color: M.carbs.c }}>C {food.carbs}g</span>
                  <span style={{ fontSize: 12, color: M.protein.c }}>P {food.protein}g</span>
                </div>
                {food.cats.map(cat => (
                  <span key={cat} style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: FOOD + '22', color: FOOD }}>{cat}</span>
                ))}
              </div>
              <Star size={15} color={food.fav ? '#daa520' : FAINT} fill={food.fav ? '#daa520' : 'none'} style={{ marginTop: 3, flexShrink: 0 }} />
            </div>
            {expandedId === food.id && (
              <div style={{ background: CARD2, padding: '10px 16px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Valori per 100g</div>
                {[
                  { label: 'Energia',     val: `${food.kcal} kcal`, color: M.kcal.c },
                  { label: 'Grassi',      val: `${food.fat}g`,      color: M.fat.c },
                  { label: 'Carboidrati', val: `${food.carbs}g`,    color: M.carbs.c },
                  { label: 'Proteine',    val: `${food.protein}g`,  color: M.protein.c },
                ].map((r, ri) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: ri < 3 ? `1px solid ${CARD}80` : 'none' }}>
                    <span style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: r.color, fontWeight: 700 }}>{r.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <button style={{ width: '100%', padding: 12, border: 'none', borderTop: `1px solid ${CARD2}`, background: CARD, color: FOOD, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Carica altri
        </button>
      </div>
      {/* Quick-add hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: CARD, borderRadius: 14, cursor: 'pointer' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: FOOD + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={14} color={FOOD} />
        </div>
        <span style={{ fontSize: 13, color: FOOD, fontWeight: 600 }}>Aggiungi &ldquo;Riso&rdquo; al database</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════ COMPLETA MACRO ═════════════════════════════
function FoodMacros() {
  const [openStep, setOpenStep] = useState<1 | 2 | 3 | null>(null)
  const sm = { label: 'Carboidrati', color: M.carbs.c }
  const amount = '50'
  const foodName = 'Riso Parboiled'
  const result = { grams: 66, kcal: 231, fat: 1, carbs: 50, protein: 5 }

  const CollapsedRow = ({ label, content, onReopen }: { label: string; content: React.ReactNode; onReopen: () => void }) => (
    <button onClick={onReopen}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: CARD, borderRadius: 16, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, width: 72, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>{content}</div>
      <ChevronRight size={15} color={FAINT} />
    </button>
  )

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Target size={22} color={FOOD} />
        <span style={{ fontSize: 20, fontWeight: 800 }}>Completa i Macro</span>
      </div>

      {/* Step 1 — Macro */}
      {openStep === 1 ? (
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${CARD2}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT }}>Macro</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: 16 }}>
            {[{ key: 'fat', label: 'Grassi', color: M.fat.c }, { key: 'carbs', label: 'Carboidrati', color: M.carbs.c }, { key: 'protein', label: 'Proteine', color: M.protein.c }].map(m => (
              <button key={m.key} onClick={() => setOpenStep(null)}
                style={{ padding: '12px 0', borderRadius: 12, border: m.key === 'carbs' ? `2px solid ${m.color}` : `1px solid ${CARD2}`, background: m.key === 'carbs' ? m.color + '20' : 'transparent', color: m.key === 'carbs' ? m.color : FAINT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <CollapsedRow label="Macro"
          content={<span style={{ fontSize: 15, fontWeight: 700, color: sm.color }}>{sm.label}</span>}
          onReopen={() => setOpenStep(1)} />
      )}

      {/* Step 2 — Quantità */}
      {openStep === 2 ? (
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${CARD2}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT }}>Quantità</span>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, border: `2px solid ${CARD2}`, background: CARD2, fontSize: 32, fontWeight: 900, color: TXT }}>
              {amount}<span style={{ fontSize: 20, fontWeight: 700, color: sm.color }}> g</span>
            </div>
            <p style={{ fontSize: 12, color: DIM, textAlign: 'center', marginTop: 8 }}>
              Circa <span style={{ fontWeight: 700, color: TXT }}>{Number(amount) * 4} kcal</span> da carboidrati
            </p>
          </div>
        </div>
      ) : (
        <CollapsedRow label="Quantità"
          content={<span style={{ fontSize: 15, fontWeight: 700, color: TXT }}>{amount}<span style={{ color: sm.color }}> g</span></span>}
          onReopen={() => setOpenStep(2)} />
      )}

      {/* Step 3 — Fonte */}
      {openStep === 3 ? (
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${CARD2}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT }}>Fonte</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: CARD2, borderRadius: 12, padding: '0 14px', height: 44 }}>
              <Search size={15} color={DIM} /><span style={{ fontSize: 13, color: FAINT }}>Cerca alimento...</span>
            </div>
            <div style={{ background: sm.color + '15', border: `1px solid ${sm.color}40`, borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: sm.color }}>{foodName}</span>
              <p style={{ fontSize: 12, color: DIM, marginTop: 3 }}>G 1g · C 76g · P 7g / 100g</p>
            </div>
          </div>
        </div>
      ) : (
        <CollapsedRow label="Fonte"
          content={<span style={{ fontSize: 15, fontWeight: 600, color: TXT }}>{foodName}</span>}
          onReopen={() => setOpenStep(3)} />
      )}

      {/* Result */}
      <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', border: `2px solid ${FOOD}35` }}>
        <div style={{ padding: '10px 20px', background: FOOD + '18', borderBottom: `1px solid ${FOOD}30` }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FOOD }}>Risultato</span>
        </div>
        <div style={{ padding: '20px 20px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: DIM, marginBottom: 6 }}>
            Per ottenere <span style={{ fontWeight: 700, color: sm.color }}>{amount}g di {sm.label}</span>
          </p>
          <p style={{ fontSize: 58, fontWeight: 900, color: TXT, lineHeight: 1 }}>
            {result.grams}<span style={{ fontSize: 24, fontWeight: 600, color: DIM }}> g</span>
          </p>
          <p style={{ fontSize: 18, fontWeight: 600, color: DIM, marginTop: 4 }}>{foodName}</p>
        </div>
        <div style={{ height: 1, background: CARD2, margin: '10px 20px' }} />
        <div style={{ padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Kcal — riga intera */}
          <div style={{ borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: M.kcal.c + '18' }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: M.kcal.c, lineHeight: 1 }}>
              {result.kcal}<span style={{ fontSize: 14, fontWeight: 500 }}>kcal</span>
            </span>
          </div>
          {/* 3 macro — riga unica */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { val: result.fat,     unit: 'g', color: M.fat.c },
              { val: result.carbs,   unit: 'g', color: M.carbs.c },
              { val: result.protein, unit: 'g', color: M.protein.c },
            ].map((item, i) => (
              <div key={i} style={{ borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', background: item.color + '18' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: item.color, lineHeight: 1 }}>
                  {item.val}<span style={{ fontSize: 12, fontWeight: 500 }}>{item.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════ PIANO ALIMENTARE ═══════════════════════════
function FoodPlan() {
  const [expandedId, setExpandedId] = useState<number | null>(1)
  const plans = [
    {
      id: 1, name: 'Massa + Cardio', isActive: true, start: '01/01/2026', end: '28/02/2026',
      daily: { kcal: 2800, fat: 80, carbs: 330, protein: 190 },
      meals: [
        { meal: 'Colazione', fat: 15, carbs: 80, protein: 40, note: { text: 'Aumentare C +30g giorni di WO', color: M.carbs.c } },
        { meal: 'Pranzo',    fat: 30, carbs: 110, protein: 65, note: null },
        { meal: 'Spuntino',  fat: 10, carbs: 60,  protein: 30, note: null },
        { meal: 'Cena',      fat: 25, carbs: 80,  protein: 55, note: null },
      ],
      note: { label: 'Ipertrofia', color: M.carbs.c, text: 'Nei giorni di allenamento pesante aumenta carboidrati di 30g.' },
    },
    {
      id: 2, name: 'Cut Deficit', isActive: false, start: '01/03/2026', end: null,
      daily: { kcal: 2100, fat: 60, carbs: 220, protein: 180 },
      meals: [], note: null,
    },
  ]

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CalendarDays size={22} color={FOOD} />
        <span style={{ fontSize: 20, fontWeight: 800 }}>Piano Alimentare</span>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', background: FOOD, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={14} /> Nuovo
        </button>
      </div>

      {plans.map(plan => {
        const isOpen = expandedId === plan.id
        return (
          <div key={plan.id} style={{ background: CARD, borderRadius: 16, overflow: 'hidden', border: plan.isActive ? `1.5px solid ${FOOD}50` : `1px solid ${CARD2}` }}>
            <div onClick={() => setExpandedId(isOpen ? null : plan.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: TXT }}>{plan.name}</span>
                  {plan.isActive && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: FOOD, color: '#fff' }}>Corrente</span>}
                </div>
                {plan.start && <p style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{plan.start}{plan.end ? ` – ${plan.end}` : ' – in corso'}</p>}
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: M.fat.c }}>G {plan.daily.fat}</span>
                  <span style={{ color: FAINT }}> · </span>
                  <span style={{ color: M.carbs.c }}>C {plan.daily.carbs}</span>
                  <span style={{ color: FAINT }}> · </span>
                  <span style={{ color: M.protein.c }}>P {plan.daily.protein}</span>
                  <span style={{ color: DIM }}> · {plan.daily.kcal} kcal</span>
                </p>
              </div>
              <span style={{ fontSize: 20, color: DIM, lineHeight: 1, paddingTop: 2 }}>⋮</span>
            </div>

            {isOpen && (
              <>
                {/* Daily totals */}
                <div style={{ padding: '14px 16px', background: FOOD + '12', borderTop: `1px solid ${FOOD}25` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    {[
                      { label: 'Kcal', val: plan.daily.kcal, color: M.kcal.c },
                      { label: 'G',    val: plan.daily.fat,     color: M.fat.c },
                      { label: 'C',    val: plan.daily.carbs,   color: M.carbs.c },
                      { label: 'P',    val: plan.daily.protein, color: M.protein.c },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: f.color }}>{f.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Per-meal blocks */}
                {plan.meals.map(m => (
                  <div key={m.meal} style={{ padding: '10px 16px', borderTop: `1px solid ${CARD2}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TXT, marginBottom: 8 }}>{m.meal}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[{ l: 'G', v: m.fat, c: M.fat.c }, { l: 'C', v: m.carbs, c: M.carbs.c }, { l: 'P', v: m.protein, c: M.protein.c }].map(f => (
                        <div key={f.l}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: f.c, marginBottom: 3 }}>{f.l}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>{f.v}g</div>
                        </div>
                      ))}
                    </div>
                    {m.note && (
                      <div style={{ marginTop: 8, padding: '5px 10px', borderLeft: `3px solid ${m.note.color}`, background: m.note.color + '12', borderRadius: '0 8px 8px 0' }}>
                        <span style={{ fontSize: 11, color: m.note.color }}>{m.note.text}</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* Plan note */}
                {plan.note && (
                  <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${CARD2}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 8 }}>Note piano</div>
                    <div style={{ borderRadius: 10, border: `1px solid ${CARD2}`, borderLeft: `3px solid ${plan.note.color}`, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: CARD2 }}>
                        <ChevronDown size={13} color={FAINT} />
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: plan.note.color }}>{plan.note.label}</span>
                      </div>
                      <div style={{ padding: '8px 14px' }}>
                        <p style={{ fontSize: 13, color: DIM, lineHeight: 1.5 }}>{plan.note.text}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════ RICETTE ════════════════════════════════════
function FoodRecipes() {
  const [expandedId, setExpandedId] = useState<number | null>(1)
  const recipes = [
    {
      id: 1, name: 'Bowl Riso e Pollo', servings: 2, totalWeight: 400,
      ingredients: [
        { name: 'Riso Parboiled', qty: 200, unit: 'g' },
        { name: 'Petto di Pollo', qty: 150, unit: 'g' },
        { name: 'Olio EVO',       qty: 10,  unit: 'g' },
        { name: 'Verdure miste',  qty: 40,  unit: 'g' },
      ],
      totale:   { kcal: 826, fat: 14, carbs: 155, protein: 54 },
      porzione: { kcal: 413, fat: 7,  carbs: 78,  protein: 27 },
      per100:   { kcal: 206, fat: 3.5, carbs: 38.8, protein: 13.5 },
    },
    {
      id: 2, name: 'Pancake Proteici', servings: 1, totalWeight: 180,
      ingredients: [
        { name: 'Fiocchi di Avena', qty: 80,  unit: 'g'  },
        { name: 'Uova',             qty: 2,   unit: 'pz' },
        { name: 'Latte scremato',   qty: 100, unit: 'ml' },
      ],
      totale:   { kcal: 460, fat: 13, carbs: 62, protein: 26 },
      porzione: { kcal: 460, fat: 13, carbs: 62, protein: 26 },
      per100:   { kcal: 256, fat: 7.2, carbs: 34.4, protein: 14.4 },
    },
  ]
  const MacroPills = ({ data, size = 'sm' }: { data: { kcal: number; fat: number; carbs: number; protein: number }; size?: 'sm' | 'lg' }) => {
    const fs = size === 'lg' ? 14 : 12
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: fs, fontWeight: 700, color: M.kcal.c }}>{data.kcal}kcal</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ fontSize: fs, fontWeight: 700, color: M.fat.c }}>{data.fat}g</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ fontSize: fs, fontWeight: 700, color: M.carbs.c }}>{data.carbs}g</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ fontSize: fs, fontWeight: 700, color: M.protein.c }}>{data.protein}g</span>
      </div>
    )
  }
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ChefHat size={22} color={FOOD} />
        <span style={{ fontSize: 20, fontWeight: 800 }}>Ricette</span>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', background: FOOD, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={14} /> Nuova Ricetta
        </button>
      </div>
      {recipes.map(recipe => {
        const isOpen = expandedId === recipe.id
        return (
          <div key={recipe.id} style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
            <div onClick={() => setExpandedId(isOpen ? null : recipe.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>
                  {recipe.name}
                  <span style={{ color: FAINT }}> · </span>
                  <span style={{ color: DIM, fontWeight: 500 }}>{recipe.totalWeight}g</span>
                  <span style={{ color: FAINT, fontSize: 11, fontWeight: 400 }}>
                    {' '}({recipe.servings > 1 ? `${recipe.servings} por. da ${Math.round(recipe.totalWeight / recipe.servings)}g` : '1 por.'})
                  </span>
                </div>
                <p style={{ fontSize: 12, marginTop: 3 }}>
                  <span style={{ color: M.kcal.c }}>{recipe.per100.kcal}kcal</span>
                  <span style={{ color: FAINT }}> · </span>
                  <span style={{ color: M.fat.c }}>{recipe.per100.fat}g</span>
                  <span style={{ color: FAINT }}> · </span>
                  <span style={{ color: M.carbs.c }}>{recipe.per100.carbs}g</span>
                  <span style={{ color: FAINT }}> · </span>
                  <span style={{ color: M.protein.c }}>{recipe.per100.protein}g</span>
                  <span style={{ color: FAINT }}> per 100g</span>
                </p>
              </div>
              <ChevronDown size={14} color={DIM} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${CARD2}` }}>
                <div style={{ padding: '10px 16px 6px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 8 }}>Ingredienti</div>
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${CARD2}` : 'none' }}>
                      <span style={{ fontSize: 11, color: FAINT, width: 20, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: 13, color: TXT, fontWeight: 600 }}>{ing.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: DIM }}>{ing.qty} {ing.unit}</span>
                    </div>
                  ))}
                </div>
                {/* Totals box */}
                <div style={{ margin: '8px 12px 14px', borderRadius: 12, background: FOOD + '10', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `1px solid ${FOOD}20` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Totale</div>
                    <MacroPills data={recipe.totale} />
                  </div>
                  <div style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `1px solid ${FOOD}20` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Per porzione ({recipe.servings > 1 ? `${Math.round(recipe.totalWeight / recipe.servings)}g` : `${recipe.totalWeight}g`})</div>
                    <MacroPills data={recipe.porzione} />
                  </div>
                  <div style={{ padding: '10px 14px', textAlign: 'center', background: FOOD + '18' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FOOD, marginBottom: 6 }}>Per 100g</div>
                    <MacroPills data={{ kcal: recipe.per100.kcal, fat: recipe.per100.fat, carbs: recipe.per100.carbs, protein: recipe.per100.protein }} size="lg" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════ LISTA SPESA ════════════════════════════════
function FoodShopping() {
  const [items, setItems] = useState([
    { id: 1, name: 'Riso Parboiled',   qty: '1 kg',  checked: false },
    { id: 2, name: 'Petto di Pollo',   qty: '500 g', checked: false },
    { id: 3, name: 'Fiocchi di Avena', qty: null,    checked: false },
    { id: 4, name: 'Uova',             qty: '6 pz',  checked: true  },
    { id: 5, name: 'Olio EVO',         qty: '1 L',   checked: true  },
  ])
  const toggle = (id: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  const unchecked = items.filter(i => !i.checked)
  const checked   = items.filter(i =>  i.checked)
  const Row = ({ item, i, total, dim }: { item: typeof items[0]; i: number; total: number; dim?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < total - 1 ? `1px solid ${CARD2}` : 'none', opacity: dim ? 0.6 : 1 }}>
      <button onClick={() => toggle(item.id)}
        style={{ width: 20, height: 20, borderRadius: 6, border: item.checked ? 'none' : `2px solid ${FAINT}`, background: item.checked ? FOOD : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        {item.checked && <Check size={11} color="#fff" />}
      </button>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: item.checked ? DIM : TXT, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
      {item.qty && (
        <span style={{ fontSize: 12, color: item.checked ? FAINT : DIM, ...(item.checked ? {} : { padding: '2px 8px', background: CARD2, borderRadius: 8 }) }}>{item.qty}</span>
      )}
      <Trash2 size={14} color={FAINT} style={{ cursor: 'pointer', flexShrink: 0 }} />
    </div>
  )
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShoppingCart size={22} color={FOOD} />
        <span style={{ fontSize: 20, fontWeight: 800 }}>Lista della Spesa</span>
      </div>
      {/* Add form */}
      <div style={{ background: CARD, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: CARD2, borderRadius: 12, padding: '0 14px', height: 44 }}>
          <Search size={15} color={DIM} /><span style={{ fontSize: 13, color: FAINT }}>Cerca o scrivi un alimento...</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, height: 40, background: CARD2, borderRadius: 12, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
            <span style={{ fontSize: 13, color: FAINT }}>Qtà (es. 1 kg)</span>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', height: 40, borderRadius: 12, border: 'none', background: FOOD, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={14} /> Aggiungi
          </button>
        </div>
      </div>
      {/* Unchecked */}
      {unchecked.length > 0 && (
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
          {unchecked.map((item, i) => <Row key={item.id} item={item} i={i} total={unchecked.length} />)}
        </div>
      )}
      {/* Acquistati */}
      {checked.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT }}>Acquistati</span>
            <button style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Svuota</button>
          </div>
          <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden' }}>
            {checked.map((item, i) => <Row key={item.id} item={item} i={i} total={checked.length} dim />)}
          </div>
        </div>
      )}
    </div>
  )
}
