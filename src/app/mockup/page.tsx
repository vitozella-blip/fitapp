'use client'
import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Check, Minus, X,
  Apple, ShoppingCart, ChefHat, Target, CalendarDays, BookOpen, Dumbbell, TrendingUp, History, Scale,
  Plus, Timer, Link2, Flame,
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
  const [view, setView] = useState<'dash' | 'food' | 'train' | 'diary'>('dash')
  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: BG, padding: '12px 16px',
        display: 'flex', gap: 6, borderBottom: '1px solid #ffffff10', overflowX: 'auto' }}>
        {([['dash', 'Dashboard'], ['food', 'Aliment.'], ['train', 'Allen.'], ['diary', 'Diario WO']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ flex: '1 0 auto', padding: '9px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
              background: view === k ? (k === 'food' ? FOOD : (k === 'train' || k === 'diary') ? TRAIN : '#30363d') : CARD, color: view === k ? '#fff' : DIM }}>
            {lbl}
          </button>
        ))}
      </div>
      {view === 'dash' && <Dash />}
      {view === 'food' && <Food />}
      {view === 'train' && <Train />}
      {view === 'diary' && <Diary />}
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

// ════════════════════════════════════ DIARIO ALLENAMENTI ══════════════════
function Diary() {
  const [date, setDate] = useState(new Date())
  const [open, setOpen] = useState<number | null>(0)
  const [tag, setTag] = useState('')
  const TAGS = ['SS', 'JS', 'MR', 'WD', 'D', 'S']
  // esercizi della scheda con riscaldamento (warm) + set di lavoro (sets)
  const ex = [
    { name: 'Panca piana', target: '4×8 · rec 90s', st: 'done',
      warm: [{ l: 'R1', v: '20×12' }, { l: 'R2', v: '40×10' }],
      sets: [{ l: 'S1', v: '60×8' }, { l: 'S2', v: '60×8' }, { l: 'S3', v: '62×6' }, { l: 'S4', v: '62×6' }], pair: null },
    { name: 'Spinte manubri', target: '3×10 · rec 75s', st: 'done',
      warm: [{ l: 'R1', v: '12×12' }],
      sets: [{ l: 'S1', v: '24×10' }, { l: 'S2', v: '24×9' }, { l: 'S3', v: '24×8' }], pair: 'SS' },
    { name: 'Croci ai cavi', target: '3×12 · rec 60s', st: 'partial',
      warm: [],
      sets: [{ l: 'S1', v: '15×12' }, { l: 'S2', v: '15×10' }], pair: 'SS' },
    { name: 'Lat machine', target: '4×10 · rec 90s', st: null, warm: [], sets: [], pair: null },
    { name: 'Rematore bilanciere', target: '4×8 · rec 90s', st: null, warm: [], sets: [], pair: null },
  ]
  const statusStyle = (st: string | null) =>
    st === 'done' ? { bg: '#7dbf7d', icon: <Check size={13} color="#fff" /> }
    : st === 'partial' ? { bg: '#f0aa78', icon: <Minus size={13} color="#fff" /> }
    : { bg: 'transparent', icon: null }

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Navigazione giorni (controlli bianchi come dashboard) */}
      <DayNav date={date} setDate={setDate} accent="#ffffff" />

      {/* Tennis svolto */}
      <div style={{ background: CARD, borderRadius: 16, padding: '10px 14px', boxShadow: SHADOW, display: 'flex', alignItems: 'center', gap: 10, borderTop: `3px solid ${TENNIS}` }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: TENNIS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TennisBall size={16} color="#fff" strokeWidth={2} /></span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Tennis</span>
        <span style={{ fontSize: 12, color: DIM }}>· allenamento · 1h</span>
      </div>

      {/* Scheda — un'unica card con bordo che contiene l'elenco esercizi */}
      <div style={{ background: CARD, borderRadius: 20, boxShadow: SHADOW, border: '1px solid #ffffff14', borderTop: `3px solid ${TRAIN}`, overflow: 'hidden' }}>
        {/* Header scheda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #ffffff10' }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: TRAIN, display: 'inline-block' }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: TRAIN }}>WORKOUT 1 — CHEST + BACK</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: DIM }}>W-6</span>
        </div>

        {/* Esercizi (righe dell'elenco) */}
        {ex.map((e, i) => {
          const ss = statusStyle(e.st)
          const isOpen = open === i
          return (
            <div key={i} style={{ borderBottom: i < ex.length - 1 ? '1px solid #ffffff0a' : 'none', background: isOpen ? '#ffffff08' : 'transparent' }}>
              {/* Pairing badge */}
              {e.pair && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 16px 0' }}>
                  <Link2 size={10} color={TRAIN} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: TRAIN }}>{e.pair}</span>
                </div>
              )}
              {/* Riga esercizio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setOpen(isOpen ? null : i)}>
                <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: ss.bg, border: e.st ? 'none' : '1.5px solid #ffffff30' }}>{ss.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{e.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: FAINT }}>{e.target}</p>
                </div>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: TRAIN + '1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={15} color={TRAIN} />
                </span>
              </div>
              {/* Set loggati + dettaglio (solo aperto) */}
              {isOpen && (
                <div style={{ padding: '0 16px 14px 50px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(e.warm.length > 0 || e.sets.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {/* riscaldamento — R1, R2 (niente fiammella, niente rettangolo) */}
                      {e.warm.map((s, j) => (
                        <span key={'w'+j} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: CARD2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C_WARM }}>{s.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{s.v}</span>
                        </span>
                      ))}
                      {/* serie di lavoro */}
                      {e.sets.map((s, j) => (
                        <span key={'s'+j} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: CARD2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: TRAIN }}>{s.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{s.v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* selettore tag */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: FAINT, marginRight: 2 }}>Tag:</span>
                    {TAGS.map(t => (
                      <button key={t} onClick={() => setTag(tag === t ? '' : t)}
                        style={{ padding: '3px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: tag === t ? TRAIN : CARD2, color: tag === t ? '#fff' : DIM }}>{t}</button>
                    ))}
                  </div>
                  {/* form: reps × kg, fiammella (riscaldamento), Set, timer */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input placeholder="reps" style={{ width: 50, padding: '7px', borderRadius: 9, border: '1px solid #ffffff14', background: CARD2, color: TXT, fontSize: 13, textAlign: 'center' }} />
                    <span style={{ color: FAINT }}>×</span>
                    <input placeholder="kg" style={{ width: 50, padding: '7px', borderRadius: 9, border: '1px solid #ffffff14', background: CARD2, color: TXT, fontSize: 13, textAlign: 'center' }} />
                    <button title="Riscaldamento" style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C_WARM}50`, background: C_WARM + '1e', color: C_WARM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Flame size={15} /></button>
                    <button style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', background: TRAIN, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Set</button>
                    <button title="Timer recupero" style={{ width: 36, height: 36, borderRadius: 9, border: 'none', background: CARD2, color: DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Timer size={16} /></button>
                  </div>
                  {/* confronto sessioni precedenti */}
                  <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', borderRadius: 10, border: `1px solid ${TRAIN}40`, background: TRAIN + '14', color: TRAIN, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    <History size={15} /> Confronta con sessioni precedenti
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
