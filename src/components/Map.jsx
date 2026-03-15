import { useEffect } from 'react'
import { Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'

const PHILLY_CENTER = { lat: 39.9526, lng: -75.1652 }
const MAP_ID = 'citywide-philly-map'

function getPinColor(rating) {
  if (!rating || rating === 0) return '#666660'
  if (rating <= 3) return '#b8860b'
  return '#c9a84c'
}

function BarPin({ bar, onClick, highlight }) {
  const color = getPinColor(bar.citywide_rating)

  return (
    <AdvancedMarker
      position={{ lat: bar.lat, lng: bar.lng }}
      onClick={() => onClick(bar)}
      title={bar.name}
    >
      <div
        className={`map-pin ${highlight ? 'map-pin--highlight' : ''}`}
        style={{
          '--pin-color': color,
          '--pin-border': color === '#c9a84c' ? '#f5f0e8' : '#888',
        }}
      >
        <span className="map-pin__icon">🍺</span>
      </div>
    </AdvancedMarker>
  )
}

function MapController({ flyTo }) {
  const map = useMap()

  useEffect(() => {
    if (map && flyTo) {
      map.panTo({ lat: flyTo.lat, lng: flyTo.lng })
      map.setZoom(16)
    }
  }, [map, flyTo])

  return null
}

export default function MapView({ bars, onBarSelect, flyTo, highlightId }) {
  return (
    <GoogleMap
      defaultCenter={PHILLY_CENTER}
      defaultZoom={13}
      mapId={MAP_ID}
      gestureHandling="greedy"
      disableDefaultUI={true}
      zoomControl={true}
      className="map-container"
    >
      <MapController flyTo={flyTo} />
      {bars.map((bar) => (
        <BarPin
          key={bar.id}
          bar={bar}
          onClick={onBarSelect}
          highlight={bar.id === highlightId}
        />
      ))}
    </GoogleMap>
  )
}
