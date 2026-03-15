import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
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

export default function BarDrawer({ bar, onClose, onBarUpdated }) {
  const drawerRef = useRef(null)
  const { rating: googleRating, reviewCount, loading: googleLoading } = useGoogleRating(bar)
  const [verifying, setVerifying] = useState(false)
  const [justVerified, setJustVerified] = useState(false)

  useEffect(() => {
    if (bar) {
      setJustVerified(false)
      requestAnimationFrame(() => {
        drawerRef.current?.classList.add('drawer--open')
      })
    }
  }, [bar])

  function handleClose() {
    drawerRef.current?.classList.remove('drawer--open')
    setTimeout(onClose, 280)
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

  if (!bar) return null

  const verifiedLabel = justVerified ? 'today' : timeAgo(bar.last_verified_at)
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
            {bar.citywide_rating > 0 ? (
              <StarRating rating={bar.citywide_rating} />
            ) : (
              <span className="drawer__rating-na">no ratings yet</span>
            )}
          </div>
        </div>

        <div className="drawer__divider" />

        <p className="drawer__coming-soon">Community ratings coming soon</p>
      </aside>
    </>
  )
}
