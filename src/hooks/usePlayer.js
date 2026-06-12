import { useState, useRef, useCallback } from 'react'

export function usePlayer() {
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef(null)

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (intervalRef.current) return
    setPlaying(true)
    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) { stop(); return prev }
        return prev + 1
      })
    }, 1000 / speed)
  }, [steps.length, speed, stop])

  const pause = useCallback(() => stop(), [stop])

  const stepForward  = useCallback(() => { stop(); setCurrentStep(p => Math.min(p + 1, steps.length - 1)) }, [stop, steps.length])
  const stepBack     = useCallback(() => { stop(); setCurrentStep(p => Math.max(p - 1, 0)) }, [stop])

  const reset = useCallback((newSteps = []) => {
    stop()
    setSteps(newSteps)
    setCurrentStep(0)
  }, [stop])

  const changeSpeed = useCallback((s) => {
    setSpeed(s)
    if (playing) { stop(); }
  }, [playing, stop])

  return { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed }
}
