// Pure helpers for cleaning and de-duplicating stories. Tested in tests/text.test.ts.

const TRACKING = /^(utm_|fbclid|gclid|ref$|source$|cmpid|ito$|ocid)/i;

export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\.|^m\.|^amp\./, "");
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    let path = u.pathname.replace(/\/amp\/?$/, "/").replace(/\/+$/, "");
    if (!path) path = "/";
    return `${u.protocol}//${u.hostname}${path}${u.search}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

// Google News titles end in " - Outlet". Strip it so the same story from two feeds matches.
export function splitOutlet(title: string): { title: string; outlet: string | null } {
  const m = title.match(/^(.*\S)\s+[-–|]\s+([^-–|]{2,60})$/);
  return m ? { title: m[1].trim(), outlet: m[2].trim() } : { title: title.trim(), outlet: null };
}

export function decodeEntities(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set("a an the of in on for to and with by at from as is are its it this that ltd limited pvt india indian csr".split(" "));

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/₹/g, " rs ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function titleKey(title: string): string {
  return tokens(title).slice(0, 12).join(" ");
}

// Jaccard similarity on title words: ≥ 0.55 is the same story reported by different outlets.
export function similarity(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export const SAME_STORY = 0.55;

// Group items whose titles describe the same story. Keeps the earliest-listed item as the lead.
export function cluster<T extends { title: string }>(items: T[], threshold = SAME_STORY): { lead: T; others: T[] }[] {
  const groups: { lead: T; others: T[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => similarity(x.lead.title, it.title) >= threshold);
    if (g) g.others.push(it);
    else groups.push({ lead: it, others: [] });
  }
  return groups;
}

export function withinWindow(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return Number.isFinite(t) && t >= start.getTime() && t <= end.getTime() + 6 * 3600_000; // allow feed clock skew
}

// Normalise a company name so "Tata Consultancy Services Ltd" and "TCS Foundation" both track to one key where possible.
export function companyKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const k = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(limited|ltd|pvt|private|inc|corporation|corp|company|co|group|india|foundation|trust|csr)\b\.?/g, " ")
    .replace(/[^a-z0-9&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return k || null;
}

// Does the quote the model gave actually appear in what it was shown? Tolerates punctuation/case and
// accepts a quote whose words are ≥ 85% present in order-insensitive form (models trim and rejoin).
export function quoteFound(quote: string | null | undefined, source: string): boolean {
  if (!quote) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9₹%]+/g, " ").trim();
  const q = norm(quote);
  const src = norm(source);
  if (!q) return false;
  if (src.includes(q)) return true;
  const qw = q.split(" ").filter((w) => w.length > 2);
  if (qw.length < 3) return false;
  const sw = new Set(src.split(" "));
  return qw.filter((w) => sw.has(w)).length / qw.length >= 0.85;
}
