import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TAGS } from '../lib/tags'
import StarRating from './StarRating'
import useGoogleRating from '../lib/useGoogleRating'

function timeAgo(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const then = new Date(dateStr)
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function getSessionId() {
  let id = localStorage.getItem('citywide_session')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('citywide_session', id)
  }
  return id
}

function getRatedBars() {
  try {
    return JSON.parse(localStorage.getItem('citywide_rated') || '{}')
  } catch {
    return {}
  }
}

function saveRating(barId, rating) {
  const rated = getRatedBars()
  rated[barId] = rating
  localStorage.setItem('citywide_rated', JSON.stringify(rated))
}

export default function BarDrawer({ bar, onClose, onBarUpdated }) {
  const drawerRef = useRef(null)
  const { rating: googleRating, reviewCount, openingHours, loading: googleLoading } = useGoogleRating(bar)
  const [verifying, setVerifying] = useState(false)
  const [justVerified, setJustVerified] = useState(false)
  const [activeTags, setActiveTags] = useState(new Set())
  const [userRating, setUserRating] = useState(null)
  const [citywideRating, setCitywideRating] = useState(0)
  const [citywideRatingCount, setCitywideRatingCount] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    if (bar) {
      setJustVerified(false)
      setActiveTags(new Set())
      setCitywideRating(bar.citywide_rating ?? 0)
      setCitywideRatingCount(bar.citywide_rating_count ?? 0)
      setUserRating(getRatedBars()[bar.id] ?? null)

      requestAnimationFrame(() => {
        drawerRef.current?.classList.add('drawer--open')
      })

      supabase
        .from('bar_tags')
        .select('tag')
        .eq('bar_id', bar.id)
        .then(({ data }) => {
          if (data) setActiveTags(new Set(data.map(r => r.tag)))
        })
    }
  }, [bar?.id])

  function handleClose() {
    drawerRef.current?.classList.remove('drawer--open')
    setTimeout(onClose, 280)
  }

  async function handleTagToggle(tag) {
    const isActive = activeTags.has(tag)
    setActiveTags(prev => {
      const next = new Set(prev)
      if (isActive) next.delete(tag)
      else next.add(tag)
      return next
    })
    if (isActive) {
      await supabase.from('bar_tags').delete().eq('bar_id', bar.id).eq('tag', tag)
    } else {
      await supabase.from('bar_tags').insert({ bar_id: bar.id, tag })
    }
  }

  async function handleVerify() {
    setVerifying(true)
    const { error } = await supabase
      .from('bars')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', bar.id)

    setVerifying(false)
    if (!error) {
      setJustVerified(true)
      onBarUpdated?.()
    }
  }

  async function handleRate(newRating) {
    setSubmittingRating(true)
    const sessionId = getSessionId()

    const { error } = await supabase
      .from('bar_ratings')
      .upsert(
        { bar_id: bar.id, session_id: sessionId, rating: newRating, updated_at: new Date().toISOString() },
        { onConflict: 'bar_id,session_id' }
      )

    if (!error) {
      const oldRating = userRating
      const oldCount = citywideRatingCount
      const oldAvg = citywideRating
      let newAvg, newCount

      if (oldRating == null) {
        newCount = oldCount + 1
        newAvg = (oldAvg * oldCount + newRating) / newCount
      } else {
        newCount = oldCount
        newAvg = oldCount > 0 ? (oldAvg * oldCount - oldRating + newRating) / oldCount : newRating
      }

      setCitywideRating(newAvg)
      setCitywideRatingCount(newCount)
      setUserRating(newRating)
      saveRating(bar.id, newRating)
      onBarUpdated?.()
    }

    setSubmittingRating(false)
  }

  if (!bar) return null

  const verifiedLabel = justVerified ? 'today' : timeAgo(bar.last_verified_at)

  let isOpen = null
  let todayHours = null
  if (openingHours) {
    if (openingHours.periods?.length) {
      const now = new Date()
      const nowVal = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes()
      isOpen = false
      for (const period of openingHours.periods) {
        const o = period.open
        const c = period.close
        if (!o) continue
        if (!c) { isOpen = true; break }
        const openVal = o.day * 1440 + o.hour * 60 + (o.minute ?? 0)
        let closeVal = c.day * 1440 + c.hour * 60 + (c.minute ?? 0)
        if (closeVal < openVal) closeVal += 7 * 1440
        let check = nowVal
        if (check < openVal) check += 7 * 1440
        if (check >= openVal && check < closeVal) { isOpen = true; break }
      }
    }
    if (openingHours.weekdayDescriptions?.length) {
      const jsDay = new Date().getDay()
      const idx = jsDay === 0 ? 6 : jsDay - 1
      const desc = openingHours.weekdayDescriptions[idx]
      if (desc) todayHours = desc.replace(/^[^:]+:\s*/, '')
    }
  }
  const isStale = !bar.last_verified_at || (new Date() - new Date(bar.last_verified_at)) > 90 * 24 * 60 * 60 * 1000

  return (
    <>
      <div className="drawer__backdrop" onClick={handleClose} />
      <aside className="drawer" ref={drawerRef}>
        <button className="drawer__close" onClick={handleClose} aria-label="Close">
          &times;
        </button>

        <h2 className="drawer__name">{bar.name}</h2>
        <p className="drawer__address">{bar.address}</p>

        {(isOpen !== null || todayHours) && (
          <div className="drawer__hours-row">
            {isOpen !== null && (
              <span className={`drawer__open-badge drawer__open-badge--${isOpen ? 'open' : 'closed'}`}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            )}
            {todayHours && (
              <span className="drawer__hours-today">{todayHours}</span>
            )}
          </div>
        )}

        <div className="drawer__divider" />

        <div className="drawer__price-row">
          <span className="drawer__price-label">CITY WIDE</span>
          <span className="drawer__price">{bar.citywide_price}</span>
        </div>

        <div className="drawer__verified-row">
          {verifiedLabel ? (
            <span className={`drawer__verified-date ${isStale && !justVerified ? 'drawer__verified-date--stale' : ''}`}>
              Verified {verifiedLabel}
            </span>
          ) : (
            <span className="drawer__verified-date drawer__verified-date--stale">
              Not yet verified
            </span>
          )}
          {!justVerified && (
            <button
              className="drawer__verify-btn"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? '...' : 'Still accurate'}
            </button>
          )}
          {justVerified && (
            <span className="drawer__verified-thanks">Thanks!</span>
          )}
        </div>

        {bar.citywide_description && (
          <p className="drawer__blurb">"{bar.citywide_description}"</p>
        )}

        <div className="drawer__divider" />

        <div className="drawer__tags">
          <span className="drawer__tags-label">TAGS</span>
          <div className="drawer__tags-list">
            {TAGS.map(tag => (
              <button
                key={tag}
                className={`drawer__tag ${activeTags.has(tag) ? 'drawer__tag--active' : ''}`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="drawer__divider" />

        <div className="drawer__ratings">
          <div className="drawer__rating-block">
            <span className="drawer__rating-source">GOOGLE</span>
            {googleLoading ? (
              <span className="drawer__rating-loading">loading...</span>
            ) : googleRating != null ? (
              <StarRating
                rating={googleRating}
                suffix={reviewCount != null ? `(${reviewCount.toLocaleString()})` : null}
              />
            ) : (
              <span className="drawer__rating-na">—</span>
            )}
          </div>

          <div className="drawer__rating-block">
            <span className="drawer__rating-source">CITYWIDE</span>
            {citywideRating > 0 ? (
              <StarRating
                rating={citywideRating}
                suffix={citywideRatingCount > 0 ? `(${citywideRatingCount})` : null}
              />
            ) : (
              <span className="drawer__rating-na">no ratings yet</span>
            )}
          </div>
        </div>

        <div className="drawer__divider" />

        <div className="drawer__community-rating">
          <span className="drawer__rating-source">
            {userRating ? 'YOUR RATING' : 'RATE THIS BAR'}
          </span>
          <StarRating
            rating={userRating ?? 0}
            interactive={!submittingRating}
            onRate={handleRate}
          />
          {userRating && (
            <span className="drawer__rating-change">tap stars to change</span>
          )}
        </div>
      </aside>
    </>
  )
}
