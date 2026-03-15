import { useState, useEffect } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

export default function useGoogleRating(bar) {
  const places = useMapsLibrary('places')
  const [rating, setRating] = useState(null)
  const [reviewCount, setReviewCount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!places || !bar) {
      setRating(null)
      setReviewCount(null)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchRating() {
      try {
        // If we have a known-good place ID, use it directly
        if (bar.google_place_id) {
          try {
            const place = new places.Place({ id: bar.google_place_id })
            await place.fetchFields({ fields: ['rating', 'userRatingCount'] })

            if (!cancelled) {
              setRating(place.rating ?? null)
              setReviewCount(place.userRatingCount ?? null)
            }
            return
          } catch {
            // Place ID invalid, fall through to text search
            console.warn(`[useGoogleRating] Place ID invalid for "${bar.name}", falling back to text search`)
          }
        }

        // Fallback: search by name + address
        const request = {
          textQuery: `${bar.name}, ${bar.address}`,
          fields: ['rating', 'userRatingCount'],
          locationBias: {
            lat: bar.lat,
            lng: bar.lng,
            radius: 200,
          },
          maxResultCount: 1,
        }

        const { places: results } = await places.Place.searchByText(request)

        if (!cancelled && results && results.length > 0) {
          const found = results[0]
          console.log(`[useGoogleRating] Found "${bar.name}" via text search, placeId: ${found.id}`)
          setRating(found.rating ?? null)
          setReviewCount(found.userRatingCount ?? null)
        } else if (!cancelled) {
          setRating(null)
          setReviewCount(null)
        }
      } catch (err) {
        console.error(`[useGoogleRating] Failed for "${bar.name}":`, err.message)
        if (!cancelled) {
          setRating(null)
          setReviewCount(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRating()
    return () => { cancelled = true }
  }, [places, bar?.id])

  return { rating, reviewCount, loading }
}
