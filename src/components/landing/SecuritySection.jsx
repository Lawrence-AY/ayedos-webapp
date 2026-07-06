export default function SecuritySection() {
  return (
    <section className="content-section" id="security">
      <div className="section-heading">
        <p className="eyebrow">Security by design</p>
        <h2>Private data. Trusted workflows.</h2>
        <p>
          AYEDOS SACCO Webapp uses role-based access so members, finance officers, and admins only see what they’re
          authorized to manage.
        </p>
      </div>

      <div className="panel-card" aria-label="Security features">
        <ul className="security-list">
          <li>Role-based access control for every module</li>
          <li>Protected API routes with JWT authentication</li>
          <li>Audit-ready operational visibility</li>
          <li>Secure onboarding and membership application flow</li>
        </ul>
      </div>

      <div className="final-band" role="note" aria-label="Security summary">
        Built to help cooperatives operate confidently, with consistent access rules and protected data handling.
      </div>
    </section>
  )
}
