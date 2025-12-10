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
  const timerRef = useRef<number | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const [playNotificationSound] = useSound(notify_music, { volume: 0.3 })

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
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

  const tick = useCallback(() => {
    if (endTimeRef.current == null) return

    const now = Date.now()
    const diffMs = endTimeRef.current - now
    const nextSecondsLeft = Math.max(0, Math.round(diffMs / 1000))

    setSecondsLeft(nextSecondsLeft)

    if (nextSecondsLeft <= 0) {
      clearTimer()
      endTimeRef.current = null
      setState('finished')
      try {
        playNotificationSound()
      } catch (e) {
        // ignore sound errors
      }
      window.api?.endSession()
      triggerNotification()
    }
  }, [clearTimer, playNotificationSound, triggerNotification])

  const start = useCallback(
    async (sites: string[]) => {
      if (!minutes) {
        setError('Enter valid time and sites.')
        return false
      }

      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission()
        } catch {
          // ignore
        }
      }

      const res = await window.api.startSession(sites)
      if (!res?.ok) {
        setError(res?.error || 'Failed to start session.')
        return false
      }

      setError(null)
      setState('running')
      clearTimer()

      const durationMs = minutes * 60 * 1000
      const endTime = Date.now() + durationMs
      endTimeRef.current = endTime

      // set initial value
      setSecondsLeft(Math.round(durationMs / 1000))
      timerRef.current = window.setInterval(tick, 1000)

      return true
    },
    [minutes, clearTimer, tick]
  )

  const stop = useCallback(async () => {
    clearTimer()
    endTimeRef.current = null
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

  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  return { state, secondsLeft, error, setError, start, stop, formatTime, strokeDashoffset }
}
