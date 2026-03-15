import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPanel({ bars, onBack, onBarsUpdated }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState(null)
  const [adminFields, setAdminFields] = useState({}) // { [submissionId]: { placeId, lat, lng } }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  async function fetchSubmissions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching submissions:', error)
    } else {
      setSubmissions(data || [])
    }
    setLoading(false)
  }

  function getField(id, field) {
    return adminFields[id]?.[field] || ''
  }

  function setField(id, field, value) {
    setAdminFields(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  function canApprove(submission) {
    const fields = adminFields[submission.id]
    if (submission.type === 'new') {
      return fields?.placeId?.trim() && fields?.lat?.trim() && fields?.lng?.trim()
    }
    // Updates: place ID required if bar doesn't already have one
    if (submission.type === 'update' && submission.bar_id) {
      const bar = bars.find(b => b.id === submission.bar_id)
      if (bar?.google_place_id) return true
      return !!fields?.placeId?.trim()
    }
    return true
  }

  async function handleApprove(submission) {
    if (!canApprove(submission)) return
    setActionInProgress(submission.id)

    const fields = adminFields[submission.id] || {}

    if (submission.type === 'new') {
      const { error } = await supabase.from('bars').insert({
        name: submission.name,
        address: submission.address,
        lat: parseFloat(fields.lat),
        lng: parseFloat(fields.lng),
        citywide_price: submission.citywide_price || 'Ask',
        citywide_description: submission.citywide_description || null,
        citywide_rating: 0,
        google_place_id: fields.placeId.trim(),
      })

      if (error) {
        console.error('Error inserting bar:', error)
        alert('Failed to insert bar: ' + error.message)
        setActionInProgress(null)
        return
      }
    } else if (submission.type === 'update' && submission.bar_id) {
      const updates = {}
      if (submission.citywide_price) updates.citywide_price = submission.citywide_price
      if (submission.citywide_description) updates.citywide_description = submission.citywide_description
      if (fields.placeId?.trim()) updates.google_place_id = fields.placeId.trim()

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('bars')
          .update(updates)
          .eq('id', submission.bar_id)

        if (error) {
          console.error('Error updating bar:', error)
          alert('Failed to update bar: ' + error.message)
          setActionInProgress(null)
          return
        }
      }
    }

    await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', submission.id)

    setActionInProgress(null)
    fetchSubmissions()
    onBarsUpdated()
  }

  async function handleReject(submission) {
    setActionInProgress(submission.id)

    await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', submission.id)

    setActionInProgress(null)
    fetchSubmissions()
  }

  const pending = submissions.filter(s => s.status === 'pending')
  const resolved = submissions.filter(s => s.status !== 'pending')

  function getBarName(barId) {
    const bar = bars.find(b => b.id === barId)
    return bar ? bar.name : 'Unknown bar'
  }

  function barHasPlaceId(barId) {
    const bar = bars.find(b => b.id === barId)
    return !!bar?.google_place_id
  }

  return (
    <div className="admin">
      <div className="admin__header">
        <h2 className="admin__title">SUBMISSIONS</h2>
        <button className="admin__refresh" onClick={fetchSubmissions}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="admin__empty">Loading...</p>
      ) : pending.length === 0 ? (
        <p className="admin__empty">No pending submissions.</p>
      ) : (
        <div className="admin__list">
          {pending.map(s => (
            <div key={s.id} className="admin__card">
              <div className="admin__card-type">
                {s.type === 'new' ? 'NEW BAR' : 'UPDATE'}
              </div>

              <h3 className="admin__card-name">
                {s.type === 'update' && s.bar_id
                  ? getBarName(s.bar_id)
                  : s.name}
              </h3>

              {s.type === 'new' && s.address && (
                <p className="admin__card-detail">{s.address}</p>
              )}

              {s.citywide_price && (
                <p className="admin__card-detail">
                  <strong>Price:</strong> {s.citywide_price}
                </p>
              )}

              {s.citywide_description && (
                <p className="admin__card-detail">
                  <strong>Description:</strong> {s.citywide_description}
                </p>
              )}

              {s.note && (
                <p className="admin__card-note">
                  Note: "{s.note}"
                </p>
              )}

              <p className="admin__card-date">
                {new Date(s.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                })}
              </p>

              <div className="admin__fields">
                <label className="admin__field">
                  <span className="admin__field-label">
                    GOOGLE PLACE ID
                    {s.type === 'new' && <span className="admin__required">*</span>}
                    {s.type === 'update' && s.bar_id && barHasPlaceId(s.bar_id) && (
                      <span className="admin__field-hint"> (already set)</span>
                    )}
                  </span>
                  <input
                    className="admin__field-input"
                    type="text"
                    placeholder="ChIJ..."
                    value={getField(s.id, 'placeId')}
                    onChange={e => setField(s.id, 'placeId', e.target.value)}
                  />
                </label>

                {s.type === 'new' && (
                  <div className="admin__field-row">
                    <label className="admin__field">
                      <span className="admin__field-label">LAT<span className="admin__required">*</span></span>
                      <input
                        className="admin__field-input"
                        type="text"
                        placeholder="39.9526"
                        value={getField(s.id, 'lat')}
                        onChange={e => setField(s.id, 'lat', e.target.value)}
                      />
                    </label>
                    <label className="admin__field">
                      <span className="admin__field-label">LNG<span className="admin__required">*</span></span>
                      <input
                        className="admin__field-input"
                        type="text"
                        placeholder="-75.1652"
                        value={getField(s.id, 'lng')}
                        onChange={e => setField(s.id, 'lng', e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="admin__card-actions">
                <button
                  className="admin__btn admin__btn--approve"
                  onClick={() => handleApprove(s)}
                  disabled={actionInProgress === s.id || !canApprove(s)}
                >
                  {s.type === 'new' ? 'APPROVE & ADD' : 'APPROVE & UPDATE'}
                </button>
                <button
                  className="admin__btn admin__btn--reject"
                  onClick={() => handleReject(s)}
                  disabled={actionInProgress === s.id}
                >
                  REJECT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <div className="admin__divider" />
          <h3 className="admin__subtitle">RESOLVED</h3>
          <div className="admin__list">
            {resolved.slice(0, 20).map(s => (
              <div key={s.id} className={`admin__card admin__card--${s.status}`}>
                <div className="admin__card-type">
                  {s.type === 'new' ? 'NEW' : 'UPDATE'} — {s.status.toUpperCase()}
                </div>
                <h3 className="admin__card-name">{s.name}</h3>
                <p className="admin__card-date">
                  {new Date(s.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="submit__back" onClick={onBack}>
        &larr; Back to map
      </button>
    </div>
  )
}
