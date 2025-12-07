import { useState, useEffect, useCallback, useRef } from 'react'
import notify_music from '../assets/sounds/chime.mp3'
import useSound from 'use-sound'
export type SessionState = 'idle' | 'running' | 'finished'

export const TIMER_RADIUS = 54
export const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS

export function useFocusTimer(minutes: number) {
  const [state, setState] = useState<SessionState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [playNotificationSound] = useSound(notify_music, { volume: 0.3 })
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

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
    }
  }, [])

  const start = useCallback(
    async (sites: string[]) => {
      if (!minutes) {
        setError('Enter valid time and sites.')
        return false
      }

      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }

      const res = await window.api.startSession(sites)
      if (!res.ok) {
        setError(res.error || 'Failed to start session.')
        return false
      }

      setError(null)
      setState('running')
      clearTimer()
      setSecondsLeft(minutes * 60)

      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!)
            setState('finished')
            playNotificationSound()
            window.api.endSession()
            triggerNotification()
            return 0
          }
          return s - 1
        })
      }, 1000)
      return true
    },
    [minutes, clearTimer, triggerNotification]
  )

  const stop = useCallback(async () => {
    clearTimer()
    await window.api.endSession()
    setState('idle')
    setSecondsLeft(0)
  }, [clearTimer])

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }, [])

  const strokeDashoffset =
    minutes > 0
      ? TIMER_CIRCUMFERENCE - (TIMER_CIRCUMFERENCE * secondsLeft) / (minutes * 60)
      : TIMER_CIRCUMFERENCE

  useEffect(() => clearTimer, [clearTimer])

  return { state, secondsLeft, error, setError, start, stop, formatTime, strokeDashoffset }
}
