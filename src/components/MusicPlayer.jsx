import { useState, useRef, useEffect, useCallback } from 'react'

const TRACK = {
  src: '/music/Citywide_Special_KLICKAUD.mp3',
  title: 'Citywide Special',
  artist: 'The Flat Possum Boys',
}

export default function MusicPlayer() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.loop = true
    audio.volume = 0.4
  }, [])

  useEffect(() => {
    if (!expanded) return
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expanded])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(p => !p)
  }, [playing])

  return (
    <div className={`music ${expanded ? 'music--expanded' : ''}`} ref={wrapperRef}>
      <audio ref={audioRef} src={TRACK.src} preload="none" />

      <button
        className={`music__disc ${playing ? 'music__disc--spinning' : ''}`}
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        <span className="music__disc-inner">
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </span>
      </button>

      <button
        className="music__info-toggle"
        onClick={() => setExpanded(e => !e)}
        aria-label="Song info"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {expanded ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="18" cy="16" r="2.5" />
            </>
          )}
        </svg>
      </button>

      {expanded && (
        <div className="music__tray">
          <span className="music__label">NOW {playing ? 'PLAYING' : 'PAUSED'}</span>
          <span className="music__title">{TRACK.title}</span>
          <span className="music__artist">{TRACK.artist}</span>
          {playing && (
            <span className="music__eq">
              <span className="music__eq-bar" />
              <span className="music__eq-bar" />
              <span className="music__eq-bar" />
              <span className="music__eq-bar" />
              <span className="music__eq-bar" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
