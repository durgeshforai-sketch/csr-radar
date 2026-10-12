import Link from "next/link";

// Shown at the bottom of every page; links to the public components map.
export function SiteFooter() {
  return (
    <footer className="site-foot">
      <span>CSR Radar · Gemini 3.7 Flash via OpenRouter · refreshed daily at 07:30 IST</span>
      <nav>
        <Link href="/map">Components map</Link>
        <Link href="/how">How it works</Link>
        <a href="https://github.com/durgeshforai-sketch/csr-radar" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
    </footer>
  );
}
