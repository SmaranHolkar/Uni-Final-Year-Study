export function PrintableMindMap({ data }) {
  return (
    <div className="print-container">
      <h1>Your Study Map</h1>

      <section>
        <h2>Needs Review</h2>
        {data.review.incorrect.map((n, i) => (
          <div key={i} className="print-node review">
            <h3>{n.label}</h3>
            <p>{n.description}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Understood</h2>
        {data.review.correct.map((n, i) => (
          <div key={i} className="print-node correct">
            <h3>{n.label}</h3>
            <p>{n.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
