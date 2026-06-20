import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildStandings, type SheetData, type Standing, type ChartPoint } from './scoring'

const SHEET_ENDPOINT = import.meta.env.VITE_SHEET_ENDPOINT as string | undefined

// A spread of distinct colors for the player lines.
const COLORS = [
  '#e6194B', '#f58231', '#ffe119', '#bfef45', '#3cb44b', '#42d4f4',
  '#4363d8', '#911eb4', '#f032e6', '#a9a9a9', '#9A6324', '#808000',
  '#469990', '#000075', '#fabed4', '#aaffc3', '#dcbeff', '#ffd8b1',
]
const colorFor = (i: number) => COLORS[i % COLORS.length]

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; chart: ChartPoint[]; standings: Standing[]; played: number }

export function Standings() {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function load() {
    if (!SHEET_ENDPOINT) {
      setState({
        kind: 'error',
        message:
          'No Google Sheet connected. Set VITE_SHEET_ENDPOINT in .env.local and ' +
          'redeploy the Apps Script with the updated doGet (see GOOGLE_SHEET_SETUP.md).',
      })
      return
    }
    setState({ kind: 'loading' })
    try {
      const res = await fetch(SHEET_ENDPOINT, { method: 'GET' })
      const data = (await res.json()) as SheetData
      if (!data || !Array.isArray(data.predictions)) {
        throw new Error('Unexpected response from the sheet.')
      }
      const { chart, standings, playedCount } = buildStandings(data)
      setState({ kind: 'ready', chart, standings, played: playedCount })
    } catch (e) {
      setState({
        kind: 'error',
        message:
          'Could not load results. Make sure the Apps Script doGet is deployed ' +
          'and returns JSON. (' + (e instanceof Error ? e.message : 'fetch failed') + ')',
      })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state.kind === 'loading' || state.kind === 'idle') {
    return <p className="standings-msg">Loading results…</p>
  }
  if (state.kind === 'error') {
    return (
      <div className="standings-msg">
        <p>{state.message}</p>
        <button type="button" className="submit-btn" onClick={load}>
          Try again
        </button>
      </div>
    )
  }
  if (state.standings.length === 0 || state.played === 0) {
    return (
      <div className="standings-msg">
        <p>No results yet. Standings appear once match results are entered in the sheet.</p>
        <button type="button" className="submit-btn" onClick={load}>
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="standings">
      <div className="standings-head">
        <h2>Cumulative Points by Player</h2>
        <button type="button" className="export-btn" onClick={load}>
          Refresh
        </button>
      </div>

      <ResponsiveContainer width="100%" height={460}>
        <LineChart data={state.chart} margin={{ top: 10, right: 20, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="match"
            tick={{ fontSize: 12 }}
            label={{ value: 'Match', position: 'insideBottom', offset: -12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: 'Cumulative Points', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Legend />
          {state.standings.map((s, i) => (
            <Line
              key={s.player}
              type="monotone"
              dataKey={s.player}
              name={`${s.rank}. ${s.player} (${s.total})`}
              stroke={colorFor(i)}
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <table className="standings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {state.standings.map((s) => (
            <tr key={s.player}>
              <td>{s.rank}</td>
              <td>{s.player}</td>
              <td>{s.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
