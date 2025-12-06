import { useEffect, useRef, useState } from 'react'
import './assets/main.css'

type SessionState = 'idle' | 'running' | 'finished'

export default function App(): React.JSX.Element {
  const [minutes, setMinutes] = useState<number>(25)
  const [todos, setTodos] = useState('')
  const [notes, setNotes] = useState('')
  const [sites, setSites] = useState('instagram.com, youtube.com, twitter.com')
  const [state, setState] = useState<SessionState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = (secs: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSecondsLeft(secs)
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          setState('finished')
          window.api.endSession()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const handleStart = async () => {
    const list = sites
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!minutes || list.length === 0) {
      setError('Enter valid time and sites.')
      return
    }
    const res = await window.api.startSession(list)
    if (!res.ok) {
      setError(res.error || 'Failed to start session.')
      return
    }
    setError(null)
    setState('running')
    startTimer(minutes * 60)
  }

  const handleStop = async () => {
    clearInterval(timerRef.current!)
    await window.api.endSession()
    setState('idle')
    setSecondsLeft(0)
  }

  const format = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  useEffect(() => {
    return () => clearInterval(timerRef.current!)
  }, [])

  return (
    <div className="app">
      <h1 className="title">f0cus Pr0</h1>
      <p className="subtitle">Firewall for your attention.</p>

      <div className="panel">
        <label>
          Duration (min):
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
          />
        </label>

        <label>
          Todos:
          <input type="text" value={todos} onChange={(e) => setTodos(e.target.value)} />
        </label>

        <label>
          Notes:
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <label>
          Sites to block:
          <input type="text" value={sites} onChange={(e) => setSites(e.target.value)} />
        </label>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      <div className="panel footer-panel">
        <p>
          STATUS: <span className={`status ${state}`}>{state.toUpperCase()}</span>
        </p>
        <p>TIMER: {state === 'running' ? format(secondsLeft) : '--:--'}</p>
        <p>TODOS: {todos || '<none>'}</p>
        <p>NOTES: {notes || '<none>'}</p>
        <p>BLOCKING: {sites}</p>
      </div>

      <div className="buttons">
        <button onClick={handleStart} disabled={state === 'running'}>
          ▶ START
        </button>
        <button onClick={handleStop} disabled={state !== 'running'}>
          ■ STOP
        </button>
      </div>

      <p className="footer mono">CTRL + Q WON'T SAVE YOU</p>
    </div>
  )
}
