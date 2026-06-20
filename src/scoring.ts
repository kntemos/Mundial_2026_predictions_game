import { matches } from './matches'

// Raw shapes returned by the Apps Script doGet endpoint.
export type RawPrediction = {
  player: string
  match: string
  homeScore: number | string
  awayScore: number | string
}
export type RawResult = {
  match: string
  homeGoals: number | string
  awayGoals: number | string
}
export type SheetData = { predictions: RawPrediction[]; results: RawResult[] }

// Scoring rules (must match the Apps Script):
//   3 pts  correct outcome (win / draw / loss)
//   3 pts  correct goal difference
//   2 pts  correct home-team goals
//   2 pts  correct away-team goals   -> exact score = 10 pts
export function scorePrediction(ph: number, pa: number, ah: number, aa: number) {
  let pts = 0
  const pd = ph - pa
  const ad = ah - aa
  if (Math.sign(pd) === Math.sign(ad)) pts += 3
  if (pd === ad) pts += 3
  if (ph === ah) pts += 2
  if (pa === aa) pts += 2
  return pts
}

// A point on the cumulative chart: { match: "3", Stelios: 24, Billakos: 21, ... }
export type ChartPoint = { match: string } & Record<string, number | string>
export type Standing = { player: string; total: number; rank: number }

function isNum(v: number | string) {
  return v !== '' && v !== null && v !== undefined && !isNaN(Number(v))
}

export function buildStandings(data: SheetData) {
  // match label -> actual score (only finished matches)
  const actual = new Map<string, { h: number; a: number }>()
  for (const r of data.results) {
    if (r.match && isNum(r.homeGoals) && isNum(r.awayGoals)) {
      actual.set(r.match, { h: Number(r.homeGoals), a: Number(r.awayGoals) })
    }
  }

  // (match | player) -> prediction, plus the set of players
  const predMap = new Map<string, RawPrediction>()
  const players: string[] = []
  for (const p of data.predictions) {
    const name = (p.player || '').toString().trim()
    if (!name) continue
    if (!players.includes(name)) players.push(name)
    predMap.set(`${p.match}|${name}`, p)
  }

  // Walk matches in fixture order, accumulating points after each finished one.
  const running: Record<string, number> = {}
  players.forEach((p) => (running[p] = 0))

  const chart: ChartPoint[] = []
  let played = 0
  for (const m of matches) {
    const label = `${m.home.name} v ${m.away.name}`
    const act = actual.get(label)
    if (!act) continue // skip matches with no result yet
    played++
    for (const p of players) {
      const pred = predMap.get(`${label}|${p}`)
      if (pred && isNum(pred.homeScore) && isNum(pred.awayScore)) {
        running[p] += scorePrediction(
          Number(pred.homeScore),
          Number(pred.awayScore),
          act.h,
          act.a,
        )
      }
    }
    const point: ChartPoint = { match: String(played) }
    for (const p of players) point[p] = running[p]
    chart.push(point)
  }

  // Rank players by final total (ties share a rank).
  const sorted = [...players].sort(
    (a, b) => running[b] - running[a] || a.localeCompare(b),
  )
  const standings: Standing[] = []
  let rank = 0
  let prev: number | null = null
  sorted.forEach((p, i) => {
    if (running[p] !== prev) {
      rank = i + 1
      prev = running[p]
    }
    standings.push({ player: p, total: running[p], rank })
  })

  return { chart, standings, playedCount: played }
}
