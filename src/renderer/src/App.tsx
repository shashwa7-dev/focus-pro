import { useState, useCallback } from 'react'
import './assets/main.css'
import { Button } from './components/ui/button'
import { useFocusTimer, TIMER_RADIUS, TIMER_CIRCUMFERENCE } from './hooks/useFocusTimer'
import { SoundControl } from './components/app/sound-control'

export default function App(): React.JSX.Element {
  const [minutes, setMinutes] = useState(25)
  const [todos, setTodos] = useState('')
  const [notes, setNotes] = useState('')
  const [sites, setSites] = useState('')
  const { state, secondsLeft, error, start, stop, formatTime, strokeDashoffset } =
    useFocusTimer(minutes)

  const handleStart = useCallback(async () => {
    const siteList = sites
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    await start(siteList)
  }, [sites, start])

  const handleStop = useCallback(async () => {
    await stop()
  }, [stop])

  return (
    <div className="app">
      <h1 className="title">f0cus Pr0</h1>
      <p className="subtitle">Firewall for your attention.</p>

      <SoundControl isRunning={state === 'running'} />

      {state !== 'running' ? (
        <div className="panel">
          <label>
            Duration (min):
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 0)}
              min="1"
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
            <input
              type="text"
              value={sites}
              onChange={(e) => setSites(e.target.value)}
              placeholder="reddit.com, twitter.com"
            />
          </label>
        </div>
      ) : (
        <div className="timer-container">
          <svg className="timer-circle" viewBox="0 0 120 120">
            <circle className="timer-bg" cx="60" cy="60" r={TIMER_RADIUS} />
            <circle
              className="timer-progress"
              cx="60"
              cy="60"
              r={TIMER_RADIUS}
              style={{
                strokeDasharray: TIMER_CIRCUMFERENCE,
                strokeDashoffset
              }}
            />
          </svg>
          <div className="timer-text">{formatTime(secondsLeft)}</div>
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}

      <div className="panel footer-panel">
        <p>
          STATUS: <span className={`status ${state}`}>{state.toUpperCase()}</span>
        </p>
        <p>TIMER: {minutes} min</p>
        <p>TODOS: {todos || '<none>'}</p>
        <p>NOTES: {notes || '<none>'}</p>
        <p>BLOCKING: {sites || '<none>'}</p>
      </div>

      <div className="buttons">
        <Button onClick={handleStart} disabled={state === 'running'}>
          ▶ START
        </Button>
        <Button onClick={handleStop} disabled={state !== 'running'}>
          ■ STOP
        </Button>
      </div>

      <p className="footer mono">CTRL + Q WON'T SAVE YOU</p>
    </div>
  )
}
