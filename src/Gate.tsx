import { useState, type FormEvent, type ReactNode } from 'react'

// Shared password. Set VITE_APP_PASSCODE in .env.local to turn the gate on.
// If it's empty, the app is open (handy for local development).
const PASSCODE = import.meta.env.VITE_APP_PASSCODE as string | undefined
const GATE_KEY = 'mundial2026-unlocked'

export function Gate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => !PASSCODE || localStorage.getItem(GATE_KEY) === PASSCODE,
  )
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  function tryUnlock(e: FormEvent) {
    e.preventDefault()
    if (entry === PASSCODE) {
      localStorage.setItem(GATE_KEY, entry)
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={tryUnlock}>
        <h1>Mundial 2026 — Predictions</h1>
        <p>Enter the password to join the game.</p>
        <input
          type="password"
          autoFocus
          className="gate-input"
          placeholder="Password"
          value={entry}
          onChange={(e) => {
            setEntry(e.target.value)
            setError(false)
          }}
        />
        {error && <p className="gate-error">Wrong password — try again.</p>}
        <button type="submit" className="gate-btn">
          Enter
        </button>
      </form>
    </div>
  )
}
