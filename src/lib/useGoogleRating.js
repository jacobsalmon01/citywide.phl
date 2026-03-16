import { useState, useEffect } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

const FIELDS = ['rating', 'userRatingCount', 'regularOpeningHours']

export default function useGoogleRating(bar) {
  const places = useMapsLibrary('places')
  const [rating, setRating] = useState(null)
  const [reviewCount, setReviewCount] = useState(null)
  const [openingHours, setOpeningHours] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!places || !bar) {
      setRating(null)
      setReviewCount(null)
      setOpeningHours(null)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchRating() {
      try {
        if (bar.google_place_id) {
          try {
            const place = new places.Place({ id: bar.google_place_id })
            await place.fetchFields({ fields: FIELDS })

            if (!cancelled) {
              setRating(place.rating ?? null)
              setReviewCount(place.userRatingCount ?? null)
              setOpeningHours(place.regularOpeningHours ?? null)
            }
            return
          } catch {
            console.warn(`[useGoogleRating] Place ID invalid for "${bar.name}", falling back to text search`)
          }
        }

        const request = {
          textQuery: `${bar.name}, ${bar.address}`,
          fields: FIELDS,
          locationBias: { lat: bar.lat, lng: bar.lng, radius: 200 },
          maxResultCount: 1,
        }

        const { places: results } = await places.Place.searchByText(request)

        if (!cancelled && results && results.length > 0) {
          const found = results[0]
          console.log(`[useGoogleRating] Found "${bar.name}" via text search, placeId: ${found.id}`)
          setRating(found.rating ?? null)
          setReviewCount(found.userRatingCount ?? null)
          setOpeningHours(found.regularOpeningHours ?? null)
        } else if (!cancelled) {
          setRating(null)
          setReviewCount(null)
          setOpeningHours(null)
        }
      } catch (err) {
        console.error(`[useGoogleRating] Failed for "${bar.name}":`, err.message)
        if (!cancelled) {
          setRating(null)
          setReviewCount(null)
          setOpeningHours(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRating()
    return () => { cancelled = true }
  }, [places, bar?.id])

  return { rating, reviewCount, openingHours, loading }
}
