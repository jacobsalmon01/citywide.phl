import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SubmitForm({ bars, onBack }) {
  const [mode, setMode] = useState('new') // 'new' | 'update'
  const [selectedBarId, setSelectedBarId] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const selectedBar = bars.find(b => b.id === selectedBarId)

  function handleBarSelect(barId) {
    setSelectedBarId(barId)
    const bar = bars.find(b => b.id === barId)
    if (bar) {
      setName(bar.name)
      setPrice(bar.citywide_price || '')
      setDescription(bar.citywide_description || '')
    }
  }

  function handleModeSwitch(newMode) {
    setMode(newMode)
    setSelectedBarId('')
    setName('')
    setPrice('')
    setDescription('')
    setNote('')
    setSubmitted(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase.from('submissions').insert({
      type: mode,
      bar_id: mode === 'update' ? selectedBarId || null : null,
      name: name.trim(),
      citywide_price: price.trim() || null,
      citywide_description: description.trim() || null,
      note: note.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      console.error('Submission error:', error)
      alert('Something went wrong. Try again.')
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="submit">
        <div className="submit__done">
          <h2 className="submit__done-title">SUBMITTED</h2>
          <p className="submit__done-text">
            {mode === 'new'
              ? `"${name}" has been submitted for review.`
              : `Update for "${name}" has been submitted.`}
          </p>
          <div className="submit__done-actions">
            <button className="submit__btn" onClick={() => handleModeSwitch(mode)}>
              Submit another
            </button>
            <button className="submit__btn submit__btn--secondary" onClick={onBack}>
              Back to map
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="submit">
      <div className="submit__tabs">
        <button
          className={`submit__tab ${mode === 'new' ? 'submit__tab--active' : ''}`}
          onClick={() => handleModeSwitch('new')}
        >
          SUBMIT A BAR
        </button>
        <button
          className={`submit__tab ${mode === 'update' ? 'submit__tab--active' : ''}`}
          onClick={() => handleModeSwitch('update')}
        >
          REQUEST UPDATE
        </button>
      </div>

      <form className="submit__form" onSubmit={handleSubmit}>
        {mode === 'update' && (
          <label className="submit__field">
            <span className="submit__label">BAR</span>
            <select
              className="submit__select"
              value={selectedBarId}
              onChange={e => handleBarSelect(e.target.value)}
              required
            >
              <option value="">Select a bar...</option>
              {bars.map(bar => (
                <option key={bar.id} value={bar.id}>{bar.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="submit__field">
          <span className="submit__label">NAME</span>
          <input
            className="submit__input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Dirty Frank's"
            required
            disabled={mode === 'update' && !!selectedBar}
          />
        </label>

        <label className="submit__field">
          <span className="submit__label">CITY WIDE PRICE</span>
          <input
            className="submit__input"
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. $5, $6, 5 and change"
          />
        </label>

        <label className="submit__field">
          <span className="submit__label">WHAT DO YOU GET?</span>
          <textarea
            className="submit__textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. PBR tallboy + shot of Jim Beam"
            rows={2}
          />
        </label>

        <label className="submit__field">
          <span className="submit__label">NOTE <span className="submit__optional">(optional)</span></span>
          <textarea
            className="submit__textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={mode === 'update'
              ? "What changed? e.g. Price went up $1 in January"
              : "Anything else? e.g. Cash only, great jukebox"}
            rows={2}
          />
        </label>

        <button
          className="submit__btn submit__btn--primary"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'SUBMITTING...' : mode === 'new' ? 'SUBMIT BAR' : 'SUBMIT UPDATE'}
        </button>
      </form>

      <button className="submit__back" onClick={onBack}>
        &larr; Back to map
      </button>
    </div>
  )
}
