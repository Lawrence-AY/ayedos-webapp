export default function HeroSection({ metrics }) {
  return (
    <section className="hero">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            A
          </div>
          <div>
            <p className="eyebrow">AYEDOS SACCO</p>
            <p className="brand-subtitle">Savings and credit cooperative platform</p>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#modules">Modules</a>
          <a href="#onboarding">Onboarding</a>
        </nav>
      </header>

      <div className="hero-grid">
        <div className="hero-copy">
          <span className="pill">Secure. Responsive. Member-first.</span>
          <h1>Manage cooperative finance with a modern React experience.</h1>
          <p className="lead">
            AYEDOS SACCO Webapp brings members, finance officers, and administrators into one
            streamlined platform for applications, loans, shares, dividends, and account
            oversight.
          </p>

          <div className="cta-row">
            <a className="button button-primary" href="/register">
              Explore modules
            </a>
            <a className="button button-secondary" href="/login">
              View onboarding flow
            </a>
          </div>

          <dl className="metrics" aria-label="Platform highlights">
            {metrics.map((metric) => (
              <div className="metric-card" key={metric.label}>
                <dt>{metric.value}</dt>
                <dd>{metric.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="hero-panel" aria-label="Platform summary">
          <div className="panel-card panel-card-primary">
            <p className="panel-label">Today’s activity</p>
            <strong>KES 2.8M</strong>
            <span>Processed across loans, shares, and deposits</span>
          </div>

          <div className="panel-stack">
            <div className="panel-card">
              <p className="panel-label">Membership applications</p>
              <strong>128 pending</strong>
              <span>Ready for review by the admin team</span>
            </div>
            <div className="panel-card">
              <p className="panel-label">Loans awaiting approval</p>
              <strong>34 applications</strong>
              <span>Tracked through finance workflow stages</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
