import "./appLoader.scss";

export default function AppLoader({ label = "Yuklanmoqda..." }) {
  return (
    <section className="app-loader" aria-busy="true" aria-live="polite">
      <div className="app-loader__card">
        <div className="app-loader__badge">BR</div>
        <div className="app-loader__copy">
          <span>Baggage Room</span>
          <h1>{label}</h1>
        </div>
        <div className="app-loader__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
