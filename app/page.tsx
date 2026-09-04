import Link from "next/link";
export default function Home() {
  return <main className="home-shell">
    <div className="sky-decor star-one">✦</div><div className="sky-decor star-two">★</div>
    <section className="hero"><div className="mascot" aria-hidden="true">🚀</div><p className="eyebrow">YOUR DAILY LEARNING ADVENTURE</p><h1>Welcome to the world of P3 Math and Science, EIRA!!!!!</h1><p className="hero-copy">Pick a quest, try all 10 questions, and grow your super brain! Fresh challenges arrive every day.</p></section>
    <section className="subject-grid" aria-label="Choose a subject">
      <Link className="subject-card math-card" href="/quiz/math"><span className="card-bubble">➗</span><span className="card-copy"><span className="card-kicker">NUMBER NINJA</span><strong>Math</strong><span>Crack clever sums and word problems!</span></span><span className="go-button">Start quest →</span></Link>
      <Link className="subject-card science-card" href="/quiz/science"><span className="card-bubble">🔬</span><span className="card-copy"><span className="card-kicker">CURIOUS EXPLORER</span><strong>Science</strong><span>Discover the amazing world around you!</span></span><span className="go-button">Start quest →</span></Link>
    </section><footer className="home-footer">☀️　Made with love for Eira　🌈</footer>
  </main>;
}
