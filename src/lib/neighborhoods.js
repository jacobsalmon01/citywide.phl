const GEOJSON_URL =
  'https://raw.githubusercontent.com/opendataphilly/open-geo-data/refs/heads/master/philadelphia-neighborhoods/philadelphia-neighborhoods.geojson'

let cachedFeatures = null

async function loadFeatures() {
  if (cachedFeatures) return cachedFeatures
  const res = await fetch(GEOJSON_URL)
  const data = await res.json()
  if (!Array.isArray(data.features)) {
    console.error('[neighborhoods] unexpected response:', data)
    throw new Error('GeoJSON features missing from response')
  }
  cachedFeatures = data.features
  return cachedFeatures
}

function raycast(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInFeature(lng, lat, feature) {
  const { type, coordinates } = feature.geometry
  const pt = [lng, lat]
  if (type === 'Polygon') return raycast(pt, coordinates[0])
  if (type === 'MultiPolygon') return coordinates.some(poly => raycast(pt, poly[0]))
  return false
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export async function getNeighborhood(lat, lng) {
  try {
    const features = await loadFeatures()
    const match = features.find(f => pointInFeature(lng, lat, f))
    if (!match) return null
    const raw = match.properties.mapname ?? match.properties.MAPNAME ?? match.properties.NAME ?? null
    return raw ? toTitleCase(raw) : null
  } catch (err) {
    console.error('[neighborhoods] lookup failed:', err.message)
    return null
  }
}
