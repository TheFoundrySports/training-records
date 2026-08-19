import type { FormProgress } from './useBJJFormProgress'
import { BJJFormPreferencesCard } from './BJJFormPreferencesCard'

interface BJJFormSummarySidebarProps {
  progress: FormProgress
  durationLabel: string
  rpeLabel: string
}

export function BJJFormSummarySidebar({
  progress,
  durationLabel,
  rpeLabel,
}: BJJFormSummarySidebarProps) {
  return (
    <aside className="side-col" aria-label="Summary">
      <section className="card" aria-labelledby="hFormSummary">
        <div className="card-head">
          <h2 id="hFormSummary">Summary</h2>
          <span className={progress.summaryTagClass}>{progress.summaryTag}</span>
        </div>
        <div className="sum-list">
          <div className="sum-row">
            <span className="sum-label">Duration</span>
            <span className="sum-val">{durationLabel}</span>
          </div>
          <div className="sum-row">
            <span className="sum-label">Sections</span>
            <span className="sum-val">{progress.sectionCount}</span>
          </div>
          <div className="sum-row">
            <span className="sum-label">Techniques</span>
            <span className="sum-val">{progress.techniqueCount}</span>
          </div>
          <div className="sum-row">
            <span className="sum-label">RPE</span>
            <span className="sum-val">{rpeLabel}</span>
          </div>
          <div className="sum-row">
            <span className="sum-label">Rolls</span>
            <span className="sum-val">
              {progress.totalRolls === 0
                ? 'None yet'
                : progress.invalidRolls > 0
                  ? `${progress.invalidRolls} need fix`
                  : `${progress.confirmedRolls} of ${progress.totalRolls} confirmed`}
            </span>
          </div>
        </div>
        <div
          className="sum-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.progressPct}
          aria-label="Registration progress"
          tabIndex={0}
        >
          <div
            className="sum-fill"
            style={{ width: `${progress.progressPct}%` }}
            data-complete={progress.progressPct === 100 ? 'true' : 'false'}
          />
        </div>
        <p className="sum-foot">{progress.summaryFoot}</p>
      </section>
      <BJJFormPreferencesCard />
    </aside>
  )
}
