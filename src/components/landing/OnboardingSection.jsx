export default function OnboardingSection({ steps }) {
  const defaultSteps = [
    {
      step: '01',
      title: 'Apply for membership',
      text: 'Complete the membership request with your details and required documents for quick processing.',
    },
    {
      step: '02',
      title: 'Submit and review',
      text: 'Your application is reviewed by the cooperative team for eligibility and required validations.',
    },
    {
      step: '03',
      title: 'Get verified access',
      text: 'Once approved, you unlock the member portal for savings, loans, dividends, and statements.',
    },
  ]

  const items = Array.isArray(steps) && steps.length ? steps : defaultSteps

  return (
    <section className="content-section" id="onboarding">
      <div className="section-heading">
        <p className="eyebrow">Onboarding made simple</p>
        <h2>From application to verified access.</h2>
        <p>
          AYEDOS SACCO Webapp streamlines onboarding so members get started faster, while finance/admin teams
          keep the process controlled.
        </p>
      </div>

      <div className="timeline" aria-label="Onboarding timeline">
        {items.map((s) => (
          <div className="timeline-item" key={s.step}>
            <div className="timeline-step" aria-hidden="true">
              {s.step}
            </div>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="final-band" role="note" aria-label="Onboarding summary">
        Members get access after approval. Finance/admin get clarity, tracking, and audit-ready records.
      </div>
    </section>
  )
}
