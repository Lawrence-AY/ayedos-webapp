const moduleCards = [
  {
    role: 'member',
    title: 'Member portal',
    summary: 'Manage savings, view statements, track loans, and stay in control.',
    bullets: ['Balances & transactions', 'Loan tracking', 'Shares & dividends', 'Profile updates'],
  },
  {
    role: 'finance',
    title: 'Finance operations',
    summary: 'Run cooperative finance workflows with approval visibility and oversight.',
    bullets: ['Loan approvals workflow', 'Deductions processing', 'Dividends handling', 'Activity visibility'],
  },
  {
    role: 'admin',
    title: 'Admin control',
    summary: 'Manage users, roles, applications, and configuration across the cooperative.',
    bullets: ['Role management', 'Application review', 'System configuration', 'Operational reporting'],
  },
]

export default function ModulesSection() {
  return (
    <section className="content-section modules-section" id="modules">
      <div className="section-heading">
        <p className="eyebrow">Modules for every role</p>
        <h2>One platform. Clear workflows.</h2>
        <p>
          AYEDOS SACCO Webapp keeps day-to-day operations organized so members, finance
          officers, and administrators always know what to do next.
        </p>
      </div>

      <div className="modules-grid">
        {moduleCards.map((card) => (
          <article
            key={card.role}
            className={`module-card ${card.role}`}
            aria-label={`${card.title} module`}
          >
            <h3>{card.title}</h3>
            <p>{card.summary}</p>
            <ul>
              {card.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
