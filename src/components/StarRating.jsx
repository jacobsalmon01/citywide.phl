export default function StarRating({ rating = 0, label, suffix }) {
  const stars = []
  const clamped = Math.max(0, Math.min(5, rating))

  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(clamped)
    stars.push(
      <span
        key={i}
        className={`star ${filled ? 'star--filled' : 'star--empty'}`}
        aria-hidden="true"
      >
        ★
      </span>
    )
  }

  return (
    <div className="star-rating" role="img" aria-label={`${label || ''} ${clamped.toFixed(1)} out of 5 stars`}>
      {label && <span className="star-rating__label">{label}</span>}
      {stars}
      {rating > 0 && <span className="star-rating__value">{clamped.toFixed(1)}</span>}
      {suffix && <span className="star-rating__suffix">{suffix}</span>}
    </div>
  )
}
