import { useState } from 'react'

export default function StarRating({ rating = 0, label, suffix, interactive = false, onRate, accent = false }) {
  const [hovered, setHovered] = useState(null)
  const clamped = Math.max(0, Math.min(5, rating))
  const display = interactive ? (hovered ?? clamped) : clamped

  const stars = []
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(display)
    const filledClass = filled
      ? (accent ? 'star--accent' : 'star--filled')
      : 'star--empty'

    if (interactive) {
      stars.push(
        <button
          key={i}
          className={`star star--interactive ${filledClass}`}
          aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onRate?.(i)}
        >
          ★
        </button>
      )
    } else {
      stars.push(
        <span
          key={i}
          className={`star ${filledClass}`}
          aria-hidden="true"
        >
          ★
        </span>
      )
    }
  }

  return (
    <div
      className="star-rating"
      role={interactive ? undefined : 'img'}
      aria-label={interactive ? undefined : `${label || ''} ${clamped.toFixed(1)} out of 5 stars`}
    >
      {label && <span className="star-rating__label">{label}</span>}
      {stars}
      {!interactive && rating > 0 && <span className="star-rating__value">{clamped.toFixed(1)}</span>}
      {suffix && <span className="star-rating__suffix">{suffix}</span>}
    </div>
  )
}
