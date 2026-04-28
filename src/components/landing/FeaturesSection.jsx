export default function FeaturesSection({ cards }) {
  return (
    <section className="content-section" id="features">
      <div className="section-heading">
        <p className="eyebrow">Built for operational clarity</p>
        <h2>Everything each role needs, without the clutter.</h2>
        <p>
          The interface is organized around the daily responsibilities of members, finance
          staff, and administrators, so each person sees exactly what matters to them.
        </p>
      </div>

      <div className="card-grid">
        {cards.map((card) => (
          <article className="feature-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.summary}</p>
            <ul>
              {card.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
