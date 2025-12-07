import { useEffect, useRef, useState, useCallback } from 'react'
import './assets/main.css'
import useSound from 'use-sound'
import bg_music from './assets/sounds/Sunset-Landscape(chosic.com).mp3'
import notify_music from './assets/sounds/chime.mp3'
import muteIcon from './assets/icons/mute.svg'
import unmuteIcon from './assets/icons/unmute.svg'
import { Button } from './components/ui/button'

type SessionState = 'idle' | 'running' | 'finished'

const TIMER_RADIUS = 54
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS

export default function App(): React.JSX.Element {
  const [minutes, setMinutes] = useState<number>(25)
  const [todos, setTodos] = useState('')
  const [notes, setNotes] = useState('')
  const [sites, setSites] = useState('')
  const [state, setState] = useState<SessionState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [muteSound, setMuteSound] = useState(false)
  const [play, { stop }] = useSound(bg_music, {
    loop: true,
    interrupt: false,
    volume: muteSound ? 0 : 0.5
  })

  const [playNotificationSound] = useSound(notify_music, {
    volume: 0.3
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized notification trigger
  const triggerNotification = useCallback(() => {
    if (window.api?.notify) {
      window.api.notify({
        title: 'Focus session finished 🎉',
        body: 'Nice work. Take a short break and then get back to it.'
      })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus session finished 🎉', {
        body: 'Nice work. Take a short break and then get back to it.'
      })
    } else {
      console.warn('Notification not available or permission not granted')
    }
  }, [])

  // Cleanup timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Memoized timer start
  const startTimer = useCallback(
    (secs: number) => {
      clearTimer()
      setSecondsLeft(secs)

      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!)
            setState('finished')
            stop()
            playNotificationSound()
            triggerNotification()
            window.api.endSession()
            return 0
          }
          return s - 1
        })
      }, 1000)
    },
    [clearTimer, stop, playNotificationSound, triggerNotification]
  )

  // Memoized start handler
  const handleStart = useCallback(async () => {
    if (!minutes) {
      setError('Enter valid time and sites.')
      return
    }

    // Request notification permission on user action
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notifications not allowed by user')
      }
    }

    const list = sites
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const res = await window.api.startSession(list)
    if (!res.ok) {
      setError(res.error || 'Failed to start session.')
      return
    }

    setError(null)
    setState('running')
    play()
    startTimer(minutes * 60)
  }, [minutes, sites, play, startTimer])
  // Memoized stop handler
  const handleStop = useCallback(async () => {
    clearTimer()
    await window.api.endSession()
    setState('idle')
    stop()
    setSecondsLeft(0)
  }, [clearTimer, stop])

  // Format time string
  const formatTime = useCallback((s: number) => {
    const mins = Math.floor(s / 60)
      .toString()
      .padStart(2, '0')
    const secs = (s % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }, [])

  // Calculate progress for timer circle
  const strokeDashoffset =
    minutes > 0
      ? TIMER_CIRCUMFERENCE - (TIMER_CIRCUMFERENCE * secondsLeft) / (minutes * 60)
      : TIMER_CIRCUMFERENCE

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return (
    <div className="app">
      <h1 className="title">f0cus Pr0</h1>
      <p className="subtitle">Firewall for your attention.</p>
      <Button
        onClick={() => setMuteSound((prev) => !prev)}
        className="sound-btn"
        data-running={state === 'running' ? true : false}
      >
        {!muteSound ? (
          <img src={unmuteIcon} width={'20px'} />
        ) : (
          <img src={muteIcon} width={'20px'} />
        )}
      </Button>
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
