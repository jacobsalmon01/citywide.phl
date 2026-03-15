import { useState, useEffect, useRef, useCallback } from 'react'

const SPIN_DURATION = 2400
const TICK_START = 60
const TICK_END = 400

export default function DiveSpinner({ bars, onResult, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('spinning') // 'spinning' | 'landed'
  const [winner, setWinner] = useState(null)
  const tickRef = useRef(null)
  const startTime = useRef(Date.now())
  const winnerIndex = useRef(Math.floor(Math.random() * bars.length))

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const progress = Math.min(elapsed / SPIN_DURATION, 1)

    // Ease-out: slow down over time
    const eased = 1 - (1 - progress) ** 3
    const interval = TICK_START + (TICK_END - TICK_START) * eased

    if (progress >= 1) {
      // Land on winner
      setCurrentIndex(winnerIndex.current)
      setPhase('landed')
      setWinner(bars[winnerIndex.current])
      return
    }

    setCurrentIndex(prev => (prev + 1) % bars.length)
    tickRef.current = setTimeout(tick, interval)
  }, [bars])

  useEffect(() => {
    startTime.current = Date.now()
    tickRef.current = setTimeout(tick, TICK_START)
    return () => clearTimeout(tickRef.current)
  }, [tick])

  function handleGo() {
    onResult(winner)
  }

  // Build the visible "reel" — 3 names: prev, current, next
  const prevIndex = (currentIndex - 1 + bars.length) % bars.length
  const nextIndex = (currentIndex + 1) % bars.length

  return (
    <div className="spinner__backdrop" onClick={phase === 'spinning' ? undefined : onClose}>
      <div className="spinner" onClick={e => e.stopPropagation()}>
        <h2 className="spinner__title">PICK MY DIVE</h2>

        <div className="spinner__window">
          <div className="spinner__fade spinner__fade--top" />
          <div className="spinner__reel">
            <div className={`spinner__name spinner__name--ghost ${phase === 'landed' ? 'spinner__name--hide' : ''}`}>
              {bars[prevIndex]?.name}
            </div>
            <div className={`spinner__name spinner__name--active ${phase === 'landed' ? 'spinner__name--winner' : ''}`}>
              {bars[currentIndex]?.name}
            </div>
            <div className={`spinner__name spinner__name--ghost ${phase === 'landed' ? 'spinner__name--hide' : ''}`}>
              {bars[nextIndex]?.name}
            </div>
          </div>
          <div className="spinner__fade spinner__fade--bottom" />

          {/* Pointer arrows on the sides */}
          <div className="spinner__pointer spinner__pointer--left" />
          <div className="spinner__pointer spinner__pointer--right" />
        </div>

        {phase === 'landed' && winner && (
          <div className="spinner__result">
            <p className="spinner__result-price">{winner.citywide_price}</p>
            <p className="spinner__result-desc">{winner.citywide_description}</p>
            <div className="spinner__result-actions">
              <button className="spinner__btn spinner__btn--go" onClick={handleGo}>
                LET'S GO
              </button>
              <button className="spinner__btn spinner__btn--again" onClick={onClose}>
                NAH, SPIN AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
