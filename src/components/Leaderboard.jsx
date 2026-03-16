import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { TAGS } from '../lib/tags'

function parsePrice(str) {
  if (!str || str.trim().toLowerCase() === 'ask') return Infinity
  const m = str.match(/\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : Infinity
}

export default function Leaderboard({ bars, onBarSelect, onBack }) {
  const [barTagsMap, setBarTagsMap] = useState({})
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  useEffect(() => {
    supabase.from('bar_tags').select('bar_id, tag').then(({ data }) => {
      if (data) {
        const map = {}
        data.forEach(({ bar_id, tag }) => {
          if (!map[bar_id]) map[bar_id] = new Set()
          map[bar_id].add(tag)
        })
        setBarTagsMap(map)
      }
    })
  }, [])

  const neighborhoods = useMemo(() => {
    const set = new Set(bars.map(b => b.neighborhood).filter(Boolean))
    return [...set].sort()
  }, [bars])

  const filtered = useMemo(() => {
    return bars
      .filter(bar => {
        if (selectedNeighborhood && bar.neighborhood !== selectedNeighborhood) return false
        if (maxPrice !== '') {
          const price = parsePrice(bar.citywide_price)
          if (price > parseFloat(maxPrice)) return false
        }
        if (selectedTags.size > 0) {
          const tags = barTagsMap[bar.id] || new Set()
          for (const t of selectedTags) {
            if (!tags.has(t)) return false
          }
        }
        return true
      })
      .sort((a, b) => parsePrice(a.citywide_price) - parsePrice(b.citywide_price))
  }, [bars, barTagsMap, selectedNeighborhood, maxPrice, selectedTags])

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const hasFilters = selectedNeighborhood || maxPrice !== '' || selectedTags.size > 0

  function clearFilters() {
    setSelectedNeighborhood('')
    setMaxPrice('')
    setSelectedTags(new Set())
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard__header">
        <h2 className="leaderboard__title">FIND A DRINK</h2>
        <p className="leaderboard__subtitle">sorted by cheapest citywide</p>
      </div>

      <div className="leaderboard__filters">
        <div className="leaderboard__filter-row">
          <select
            className="leaderboard__select"
            value={selectedNeighborhood}
            onChange={e => setSelectedNeighborhood(e.target.value)}
          >
            <option value="">All neighborhoods</option>
            {neighborhoods.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <div className="leaderboard__price-wrap">
            <span className="leaderboard__price-prefix">only got $</span>
            <input
              type="number"
              className="leaderboard__price-input"
              placeholder="∞"
              min="0"
              step="1"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="leaderboard__tag-filters">
          {TAGS.map(tag => (
            <button
              key={tag}
              className={`leaderboard__tag ${selectedTags.has(tag) ? 'leaderboard__tag--active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="leaderboard__meta">
        <span className="leaderboard__count">
          {filtered.length} {filtered.length === 1 ? 'bar' : 'bars'}
          {hasFilters ? ' match' : ''}
        </span>
        {hasFilters && (
          <button className="leaderboard__clear" onClick={clearFilters}>
            clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="leaderboard__empty">
          <svg className="leaderboard__empty-face" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2"/>
            <circle cx="22" cy="26" r="2.5" fill="currentColor"/>
            <circle cx="42" cy="26" r="2.5" fill="currentColor"/>
            <path d="M20 44 Q32 36 44 44" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="leaderboard__empty-msg">No bars match your criteria.</p>
          <p className="leaderboard__empty-sub">Maybe try the corner store?</p>
        </div>
      ) : (
        <ol className="leaderboard__list">
          {filtered.map((bar, i) => {
            const tags = [...(barTagsMap[bar.id] || [])]
            const priceVal = parsePrice(bar.citywide_price)
            return (
              <li key={bar.id} className="leaderboard__item" onClick={() => onBarSelect(bar)}>
                <span className="leaderboard__rank">{String(i + 1).padStart(2, '0')}</span>
                <div className="leaderboard__item-body">
                  <span className="leaderboard__item-name">{bar.name}</span>
                  <div className="leaderboard__item-meta">
                    {bar.neighborhood && (
                      <span className="leaderboard__item-neighborhood">{bar.neighborhood}</span>
                    )}
                    {tags.length > 0 && (
                      <span className="leaderboard__item-tags">
                        {bar.neighborhood && <span className="leaderboard__dot">·</span>}
                        {tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`leaderboard__price ${priceVal === Infinity ? 'leaderboard__price--ask' : ''}`}>
                  {priceVal === Infinity ? 'Ask' : `${bar.citywide_price}`}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <button className="submit__back" onClick={onBack}>
        &larr; Back to map
      </button>
    </div>
  )
}
