import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { matches, type Team } from './matches'
import './App.css'

// Lazy-loaded so the charting library only downloads when Standings is opened.
const Standings = lazy(() =>
  import('./Standings').then((m) => ({ default: m.Standings })),
)

// One prediction = the two scores a player entered for a match.
type Prediction = { home: number | ''; away: number | '' }
type Predictions = Record<string, Prediction>

const STORAGE_KEY = 'mundial2026-predictions'
const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => i) // 0..10

// Deployed Google Apps Script Web App URL. Set in .env.local — see
// GOOGLE_SHEET_SETUP.md. If empty, the Submit button falls back to export.
const SHEET_ENDPOINT = import.meta.env.VITE_SHEET_ENDPOINT as string | undefined

type SubmitStatus = 'idle' | 'sending' | 'done' | 'error'

type Saved = { player: string; predictions: Predictions }

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Saved
  } catch {
    // ignore corrupted/blocked storage
  }
  return { player: '', predictions: {} }
}

function flagUrl(code: string) {
  return `https://flagcdn.com/w160/${code}.png`
}

function Flag({ team }: { team: Team }) {
  return (
    <img
      className="flag"
      src={flagUrl(team.code)}
      srcSet={`${flagUrl(team.code)} 1x, https://flagcdn.com/w320/${team.code}.png 2x`}
      width={90}
      height={90}
      alt={`${team.name} flag`}
      loading="lazy"
    />
  )
}

function ScoreSelect({
  value,
  onChange,
  label,
}: {
  value: number | ''
  onChange: (v: number | '') => void
  label: string
}) {
  return (
    <select
      className="score"
      aria-label={label}
      value={value}
      onChange={(e) =>
        onChange(e.target.value === '' ? '' : Number(e.target.value))
      }
    >
      <option value="">–</option>
      {SCORE_OPTIONS.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
}

function App() {
  const initial = useMemo(loadSaved, [])
  const [player, setPlayer] = useState(initial.player)
  const [predictions, setPredictions] = useState<Predictions>(
    initial.predictions,
  )
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [view, setView] = useState<'predict' | 'standings'>('predict')

  // Auto-save to this browser whenever anything changes.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ player, predictions }))
  }, [player, predictions])

  function setScore(matchId: string, side: 'home' | 'away', v: number | '') {
    setStatus('idle')
    setPredictions((prev) => {
      const existing = prev[matchId] ?? { home: '', away: '' }
      return { ...prev, [matchId]: { ...existing, [side]: v } }
    })
  }

  const completed = matches.filter((m) => {
    const p = predictions[m.id]
    return p && p.home !== '' && p.away !== ''
  }).length

  // Only the matches this player has fully predicted.
  function buildRows() {
    return matches
      .map((m) => {
        const p = predictions[m.id]
        if (!p || p.home === '' || p.away === '') return null
        return {
          matchId: m.id,
          match: `${m.home.name} v ${m.away.name}`,
          date: `${m.date} ${m.time}`,
          home: m.home.name,
          away: m.away.name,
          homeScore: p.home,
          awayScore: p.away,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }

  function exportPredictions() {
    if (!player.trim()) {
      alert('Please enter your name first.')
      return
    }
    const payload = {
      player: player.trim(),
      submittedAt: new Date().toISOString(),
      predictions: buildRows(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${player.trim().replace(/\s+/g, '_')}_predictions.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function submitToSheet() {
    if (!player.trim()) {
      alert('Please enter your name first.')
      return
    }
    if (!SHEET_ENDPOINT) {
      alert(
        'No Google Sheet is connected yet. See GOOGLE_SHEET_SETUP.md to set ' +
          'one up, or use "Export my predictions" instead.',
      )
      return
    }
    const rows = buildRows()
    if (rows.length === 0) {
      alert('Please predict at least one match before submitting.')
      return
    }
    setStatus('sending')
    try {
      // Apps Script Web Apps don't return CORS headers, so we send a
      // "simple" request (text/plain, no preflight) and don't read the
      // response. No network error = the row was written.
      await fetch(SHEET_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          player: player.trim(),
          submittedAt: new Date().toISOString(),
          predictions: rows,
        }),
      })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mundial 2026 — Predictions</h1>
        <nav className="tabs">
          <button
            type="button"
            className={view === 'predict' ? 'tab active' : 'tab'}
            onClick={() => setView('predict')}
          >
            Make predictions
          </button>
          <button
            type="button"
            className={view === 'standings' ? 'tab active' : 'tab'}
            onClick={() => setView('standings')}
          >
            Standings
          </button>
        </nav>
      </header>

      {view === 'standings' ? (
        <Suspense fallback={<p className="standings-msg">Loading…</p>}>
          <Standings />
        </Suspense>
      ) : (
        <>
        <div className="player-row">
          <label htmlFor="player">Your name</label>
          <input
            id="player"
            className="player-input"
            placeholder="e.g. Kostas"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
          />
          <span className="progress">
            {completed}/{matches.length} predicted
          </span>
          <button
            type="button"
            className="submit-btn"
            onClick={submitToSheet}
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Submitting…' : 'Submit predictions'}
          </button>
          <button type="button" className="export-btn" onClick={exportPredictions}>
            Export file
          </button>
        </div>
        {status === 'done' && (
          <p className="status status-ok">
            ✓ Submitted! Re-submit any time to update your picks.
          </p>
        )}
        {status === 'error' && (
          <p className="status status-err">
            Couldn't submit. Check your connection, or use “Export file” instead.
          </p>
        )}

      <div className="fixtures">
        {matches.map((m) => {
          const p = predictions[m.id] ?? { home: '', away: '' }
          return (
            <div className="match" key={m.id}>
              <div className="team team-home">
                <span className="team-name">{m.home.name}</span>
                <Flag team={m.home} />
              </div>

              <ScoreSelect
                label={`${m.home.name} score`}
                value={p.home}
                onChange={(v) => setScore(m.id, 'home', v)}
              />

              <div className="center">
                <div className="datetime">
                  {m.date}, {m.time}
                </div>
                <div className="venue">{m.venue}</div>
              </div>

              <ScoreSelect
                label={`${m.away.name} score`}
                value={p.away}
                onChange={(v) => setScore(m.id, 'away', v)}
              />

              <div className="team team-away">
                <span className="team-name">{m.away.name}</span>
                <Flag team={m.away} />
              </div>
            </div>
          )
        })}
      </div>

      <p className="hint">
        Your picks are saved automatically in this browser. When you're done,
        click <strong>Export my predictions</strong> and send the file to whoever
        is collecting them.
      </p>
        </>
      )}
    </div>
  )
}

export default App
