import { useState, useEffect, useMemo, useCallback } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { supabase } from './lib/supabase'
import MapView from './components/Map'
import BarDrawer from './components/BarDrawer'
import SubmitForm from './components/SubmitForm'
import AdminPanel from './components/AdminPanel'
import Leaderboard from './components/Leaderboard'
import DiveSpinner from './components/DiveSpinner'
import AvgPriceBanner from './components/AvgPriceBanner'
import MusicPlayer from './components/MusicPlayer'

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const adminKey = import.meta.env.VITE_ADMIN_KEY
const ADMIN_SESSION_KEY = 'cw_admin'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function App() {
  const [bars, setBars] = useState([])
  const [selectedBar, setSelectedBar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('map')
  const [flyTo, setFlyTo] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [nearMeStatus, setNearMeStatus] = useState(null)
  const [showSpinner, setShowSpinner] = useState(false)
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1')
  const [showAdminGate, setShowAdminGate] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [adminError, setAdminError] = useState(false)

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      window.history.replaceState(null, '', '/')
      if (isAdmin) {
        setView('admin')
      } else {
        setShowAdminGate(true)
      }
    }
  }, [])

  useEffect(() => {
    fetchBars()
  }, [])

  async function fetchBars() {
    const { data, error } = await supabase
      .from('bars')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching bars:', error)
    } else {
      setBars(data || [])
    }
    setLoading(false)
  }

  function handleBarSelect(bar) {
    setSelectedBar(bar)
    setHighlightId(bar.id)
  }

  function handleDrawerClose() {
    setSelectedBar(null)
    setHighlightId(null)
  }

  const handleNearMe = useCallback(() => {
    if (bars.length === 0) return
    setNearMeStatus('locating')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        let closest = null
        let closestDist = Infinity

        for (const bar of bars) {
          const d = haversine(latitude, longitude, bar.lat, bar.lng)
          if (d < closestDist) {
            closestDist = d
            closest = bar
          }
        }

        if (closest) {
          setFlyTo({ lat: closest.lat, lng: closest.lng, _ts: Date.now() })
          setHighlightId(closest.id)
          setSelectedBar(closest)
        }

        setNearMeStatus(null)
      },
      () => {
        setNearMeStatus('error')
        setTimeout(() => setNearMeStatus(null), 3000)
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [bars])

  const handleRandom = useCallback(() => {
    if (bars.length === 0) return
    setShowSpinner(true)
  }, [bars])

  function handleAdminSubmit(e) {
    e.preventDefault()
    if (adminInput === adminKey) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
      setIsAdmin(true)
      setShowAdminGate(false)
      setView('admin')
      setAdminInput('')
      setAdminError(false)
    } else {
      setAdminError(true)
      setAdminInput('')
    }
  }

  function handleAdminGateClose() {
    setShowAdminGate(false)
    setAdminInput('')
    setAdminError(false)
  }

  const handleSpinResult = useCallback((bar) => {
    setShowSpinner(false)
    setFlyTo({ lat: bar.lat, lng: bar.lng, _ts: Date.now() })
    setHighlightId(bar.id)
    setSelectedBar(bar)
  }, [])

  return (
    <APIProvider apiKey={apiKey}>
      <div className="page">
        <header className="header">
          <h1
            className="header__title"
            onClick={() => setView('map')}
            style={{ cursor: 'pointer' }}
          >
            CITYWIDE<span className="header__dot">.</span>PHL
          </h1>
          <p className="header__tagline">Know before you go!</p>
          {isAdmin && (
            <nav className="header__nav">
              <button
                className={`header__nav-btn ${view === 'map' ? 'header__nav-btn--active' : ''}`}
                onClick={() => setView('map')}
              >
                MAP
              </button>
              <button
                className={`header__nav-btn ${view === 'admin' ? 'header__nav-btn--active' : ''}`}
                onClick={() => setView('admin')}
              >
                ADMIN
              </button>
            </nav>
          )}
        </header>

        <AvgPriceBanner />

        <main className="main">
          {view === 'map' && (
            <div className="map-view">
              <div className="map-tile">
                <div className="map-tile__frame">
                  {loading ? (
                    <div className="map-tile__loading">
                      <span>POURING...</span>
                    </div>
                  ) : (
                    <MapView
                      bars={bars}
                      onBarSelect={handleBarSelect}
                      flyTo={flyTo}
                      highlightId={highlightId}
                    />
                  )}
                </div>
              </div>

              <div className="toolbar">
                <div className="toolbar__buttons">
                  <button
                    className="toolbar__btn"
                    onClick={handleNearMe}
                    disabled={nearMeStatus === 'locating' || bars.length === 0}
                  >
                    {nearMeStatus === 'locating'
                      ? 'LOCATING...'
                      : nearMeStatus === 'error'
                      ? 'LOCATION DENIED'
                      : 'NEAR ME'}
                  </button>
                  <span className="toolbar__divider" />
                  <button
                    className="toolbar__btn"
                    onClick={handleRandom}
                    disabled={bars.length === 0}
                  >
                    PICK MY DIVE
                  </button>
                  <span className="toolbar__divider" />
                  <button
                    className="toolbar__btn"
                    onClick={() => setView('leaderboard')}
                    disabled={bars.length === 0}
                  >
                    FIND A DRINK
                  </button>
                  <span className="toolbar__divider" />
                  <button
                    className="toolbar__btn"
                    onClick={() => setView('submit')}
                  >
                    SUBMIT OR UPDATE A BAR
                  </button>
                </div>
                <p className="toolbar__note">
                  Work in progress — {bars.length} bars and counting.
                </p>
                <a
                  className="tip-link"
                  href="https://buymeacoffee.com/jacobsalmon01"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  buy me a citywide &rarr;
                </a>
              </div>

              {selectedBar && (
                <BarDrawer bar={selectedBar} onClose={handleDrawerClose} onBarUpdated={fetchBars} />
              )}
            </div>
          )}

          {view === 'submit' && (
            <SubmitForm bars={bars} onBack={() => setView('map')} />
          )}

          {view === 'leaderboard' && (
            <Leaderboard
              bars={bars}
              onBarSelect={(bar) => {
                setFlyTo({ lat: bar.lat, lng: bar.lng, _ts: Date.now() })
                setHighlightId(bar.id)
                setSelectedBar(bar)
                setView('map')
              }}
              onBack={() => setView('map')}
            />
          )}

          {view === 'admin' && isAdmin && (
            <AdminPanel bars={bars} onBack={() => setView('map')} onBarsUpdated={fetchBars} />
          )}
        </main>
      </div>

      <MusicPlayer />

      {showAdminGate && (
        <div className="admin-gate__backdrop" onClick={handleAdminGateClose}>
          <form
            className="admin-gate"
            onSubmit={handleAdminSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-gate__lock">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="admin-gate__title">STAFF ONLY</h2>
            <p className="admin-gate__sub">Enter the password to continue.</p>
            <input
              className={`admin-gate__input ${adminError ? 'admin-gate__input--error' : ''}`}
              type="password"
              value={adminInput}
              onChange={(e) => { setAdminInput(e.target.value); setAdminError(false) }}
              placeholder={adminError ? 'WRONG PASSWORD' : 'PASSWORD'}
              autoFocus
            />
            <div className="admin-gate__actions">
              <button type="button" className="admin-gate__btn admin-gate__btn--cancel" onClick={handleAdminGateClose}>
                BACK
              </button>
              <button type="submit" className="admin-gate__btn admin-gate__btn--enter" disabled={!adminInput}>
                ENTER
              </button>
            </div>
          </form>
        </div>
      )}

      {showSpinner && bars.length > 0 && (
        <DiveSpinner
          bars={bars}
          onResult={handleSpinResult}
          onClose={() => setShowSpinner(false)}
        />
      )}
    </APIProvider>
  )
}
