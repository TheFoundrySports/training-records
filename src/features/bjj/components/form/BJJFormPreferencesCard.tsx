import { useState } from 'react'

const PREFERENCE_ITEMS = [
  {
    id: 'roll-tips',
    label: 'Show roll review tips',
    hint: 'Inline hints on the roll review card.',
  },
  {
    id: 'auto-enhance',
    label: 'Suggest AI enhance after goal',
    hint: 'Prompt to run enhance when a section goal is filled.',
  },
  {
    id: 'dashboard-window',
    label: 'Default dashboard window',
    hint: 'Will sync with evolution dashboard time filter.',
  },
] as const

export function BJJFormPreferencesCard() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    'roll-tips': true,
    'auto-enhance': false,
    'dashboard-window': false,
  })

  const handleToggle = (id: string) => {
    setPrefs((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <section className="card" aria-labelledby="hFormPrefs">
      <div className="card-head">
        <h2 id="hFormPrefs">Preferences</h2>
        <span className="tag pending">Preview</span>
      </div>
      <ul className="pref-list">
        {PREFERENCE_ITEMS.map((item) => (
          <li key={item.id} className="pref-row">
            <div className="pref-copy">
              <span className="pref-label">{item.label}</span>
              <span className="pref-hint">{item.hint}</span>
            </div>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={prefs[item.id]}
              aria-label={item.label}
              data-state={prefs[item.id] ? 'on' : 'off'}
              onClick={() => handleToggle(item.id)}
            >
              <span className="switch-thumb" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="hint" style={{ marginTop: 'var(--space-4)' }}>
        UI-only for now — wiring to settings and dashboard defaults is deferred.
      </p>
    </section>
  )
}
