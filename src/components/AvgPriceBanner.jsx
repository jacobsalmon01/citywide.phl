import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

function parsePrice(str) {
  if (!str || str.trim().toLowerCase() === 'ask') return null
  const m = str.match(/\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export default function AvgPriceBanner() {
  const [priced, setPriced] = useState(null) // null = loading, [] = no data

  useEffect(() => {
    supabase
      .from('bars')
      .select('id, name, citywide_price')
      .not('citywide_price', 'is', null)
      .then(({ data }) => {
        const valid = (data || []).filter(b => parsePrice(b.citywide_price) !== null)
        setPriced(valid)
      })
  }, [])

  const [open, setOpen] = useState(false)

  const stats = useMemo(() => {
    if (!priced || priced.length === 0) return null
    const prices = priced.map(b => parsePrice(b.citywide_price))
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const cheapest = priced.find(b => parsePrice(b.citywide_price) === min)
    const priciest = priced.find(b => parsePrice(b.citywide_price) === max)
    return { avg, min, max, count: priced.length, cheapest, priciest }
  }, [priced])

  // Don't render until we have real data
  if (!stats) return null

  return (
    <>
      <button
        className="avg-banner"
        onClick={() => setOpen(true)}
        aria-label="Average citywide price — click for details"
      >
        <span className="avg-banner__label">AVG CITYWIDE</span>
        <span className="avg-banner__price">${stats.avg.toFixed(2)}</span>
        <span className="avg-banner__cta">PRICE HISTORY ↗</span>
      </button>

      {open && (
        <>
          <div className="avg-modal__backdrop" onClick={() => setOpen(false)} />
          <div className="avg-modal" role="dialog" aria-modal="true">
            <button
              className="avg-modal__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="avg-modal__hero">
              <div className="avg-modal__hero-label">AVERAGE CITYWIDE SPECIAL</div>
              <div className="avg-modal__hero-price">${stats.avg.toFixed(2)}</div>
              <div className="avg-modal__hero-meta">
                across {stats.count} bar{stats.count !== 1 ? 's' : ''} on the map
              </div>
            </div>

            <div className="avg-modal__divider" />

            <div className="avg-modal__range">
              <div className="avg-modal__range-col">
                <div className="avg-modal__range-label">CHEAPEST</div>
                <div className="avg-modal__range-name">{stats.cheapest?.name}</div>
                <div className="avg-modal__range-price avg-modal__range-price--low">
                  ${stats.min.toFixed(2)}
                </div>
              </div>
              <div className="avg-modal__range-sep" />
              <div className="avg-modal__range-col avg-modal__range-col--right">
                <div className="avg-modal__range-label">PRICIEST</div>
                <div className="avg-modal__range-name">{stats.priciest?.name}</div>
                <div className="avg-modal__range-price avg-modal__range-price--high">
                  ${stats.max.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="avg-modal__divider" />

            <p className="avg-modal__caveat">
              * These numbers are based solely on what's currently mapped, and may not be spot-on. The more bars we add, the more accurate this number will be!
            </p>

            <div className="avg-modal__divider" />

            <div className="avg-modal__graph-section">
              <div className="avg-modal__graph-title">PRICE OVER TIME</div>
              <div className="avg-modal__graph">
                <div className="avg-modal__graph-y">
                  <span>${(stats.avg + 1).toFixed(0)}</span>
                  <span>${stats.avg.toFixed(0)}</span>
                  <span>${Math.max(0, stats.avg - 1).toFixed(0)}</span>
                </div>
                <div className="avg-modal__graph-area">
                  {['MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'].map((m, i) => (
                    <div key={m} className="avg-modal__graph-col">
                      <div
                        className="avg-modal__graph-bar"
                        style={{ '--bar-h': `${30 + (i === 0 ? 50 : 0)}%` }}
                      />
                      <div className="avg-modal__graph-month">{m}</div>
                    </div>
                  ))}
                  <div className="avg-modal__graph-overlay">
                    <div className="avg-modal__graph-msg">
                      <span className="avg-modal__graph-msg-line">Collecting since Mar 2026</span>
                      <span className="avg-modal__graph-msg-line avg-modal__graph-msg-line--sub">
                        Graph coming soon!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
