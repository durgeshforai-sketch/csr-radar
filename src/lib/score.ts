import type { Extraction } from "./extract";
import type { GeoTier, Settings } from "./settings";

// Ananya's decision — "is this worth a call this week?" — as deterministic, explainable code.
// Gemini supplies facts; every point here comes from a weight she can change on /settings.

export type Bucket = "call" | "watch" | "fyi" | "policy" | "skip";
export type ScoreLine = { label: string; points: number };
export type ScoreBreakdown = { lines: ScoreLine[]; geoTier: GeoTier | "other" | "unknown"; rule: string };

export function geoTier(e: Pick<Extraction, "places" | "panIndia">, s: Settings): GeoTier | "other" | "unknown" {
  const places = e.places.map((p) => p.toLowerCase());
  const hit = (tier: GeoTier) =>
    s.geographies.filter((g) => g.tier === tier).some((g) => g.terms.some((t) => places.some((p) => p.includes(t.toLowerCase()))));
  if (hit("home")) return "home";
  if (hit("priority")) return "priority";
  if (e.panIndia || hit("national")) return "national";
  return places.length ? "other" : "unknown";
}

export function score(
  e: Extraction,
  ctx: { publishedAt: Date; now: Date; evidenceVerified: boolean; priorSignals: number; openCall?: boolean },
  s: Settings,
): { score: number; bucket: Bucket; breakdown: ScoreBreakdown } {
  const w = s.weights;
  const lines: ScoreLine[] = [];
  const tier = geoTier(e, s);
  const enabled = new Set(s.sectors.filter((x) => x.enabled).map((x) => x.key));
  const sectorHit = e.sectors.some((k) => enabled.has(k));

  // An open call for NGO partners (RFP / EOI, deadline not passed, page verified) is always Hot:
  // it is the exact moment she missed last year.
  if (ctx.openCall && e.signalType !== "not_relevant") {
    const lines: ScoreLine[] = [
      { label: "Open call for NGO partners", points: w.partner_search },
      ...(sectorHit ? [{ label: "In her sectors", points: w.sectorFit }] : []),
      ...(e.amountInrCrore != null ? [{ label: e.amountInrCrore >= 10 ? "₹10 Cr+ committed" : "Amount stated", points: e.amountInrCrore >= 10 ? w.amountLarge : w.amountAny }] : []),
    ];
    const total = Math.min(100, Math.max(s.thresholds.call, lines.reduce((a, l) => a + l.points, 0)));
    return { score: total, bucket: "call", breakdown: { lines, geoTier: tier, rule: `Open call for NGO partners${e.deadline ? ` — closes ${e.deadline}` : ""} → always Hot` } };
  }
  if (e.signalType === "policy_change")
    return { score: 50, bucket: "policy", breakdown: { lines: [], geoTier: tier, rule: "Policy change — always shown in Policy watch" } };

  // Nothing is hidden: off-sector or non-CSR stories still get a score and land in "Cold", with the reason.
  const typeKey = e.signalType === "not_relevant" ? "other_csr" : e.signalType;
  lines.push({ label: SIGNAL_POINTS_LABEL[typeKey], points: e.signalType === "not_relevant" ? 0 : w[typeKey] });
  if (sectorHit) lines.push({ label: "In her sectors", points: w.sectorFit });
  else lines.push({ label: "Outside her sectors", points: 0 });
  if (e.audienceMatch) lines.push({ label: "Serves her audience (youth / first-gen)", points: w.audienceFit });

  const geoPts = { home: w.geoHome, priority: w.geoPriority, national: w.geoNational, other: w.geoOther, unknown: Math.round(w.geoNational / 2) }[tier];
  lines.push({ label: GEO_LABEL[tier], points: geoPts });

  if (e.amountInrCrore != null) {
    lines.push(e.amountInrCrore >= 10 ? { label: "₹10 Cr+ committed", points: w.amountLarge } : { label: "Amount stated", points: w.amountAny });
  }

  const ageDays = Math.max(0, (ctx.now.getTime() - ctx.publishedAt.getTime()) / 86_400_000);
  const rec = Math.round(w.recency * Math.max(0, Math.min(1, (7 - ageDays) / 5)));
  if (rec) lines.push({ label: ageDays < 1 ? "Published today" : `${Math.round(ageDays)}d old`, points: rec });

  if (ctx.priorSignals > 0) lines.push({ label: `Warming: ${ctx.priorSignals} earlier signal${ctx.priorSignals > 1 ? "s" : ""}`, points: w.warming });
  if (e.stage === "completed") lines.push({ label: "Project already completed", points: -w.completedPenalty });
  if (!ctx.evidenceVerified) lines.push({ label: "Evidence not found in source", points: -w.unverifiedPenalty });
  if (e.confidence === "low") lines.push({ label: "Thin source (headline only)", points: -5 });

  let total = Math.max(0, Math.min(100, lines.reduce((a, l) => a + l.points, 0)));
  if (e.signalType === "not_relevant") {
    total = Math.min(total, 15);
    return { score: total, bucket: "skip", breakdown: { lines, geoTier: tier, rule: "Cold: not Indian corporate CSR, per the reader" } };
  }
  if (!sectorHit) {
    total = Math.min(total, s.thresholds.watch - 1);
    return { score: total, bucket: "skip", breakdown: { lines, geoTier: tier, rule: "Cold: outside her sectors" } };
  }

  // Override: an explicit partner search in her sectors is always a call — that is the moment she missed last year.
  if (e.partnerSearchExplicit && ctx.evidenceVerified && tier !== "other") {
    return { score: Math.max(total, s.thresholds.call), bucket: "call", breakdown: { lines, geoTier: tier, rule: "Explicit partner search in her sectors → always a call" } };
  }
  const bucket: Bucket = total >= s.thresholds.call ? "call" : total >= s.thresholds.watch ? "watch" : "fyi";
  return {
    score: total,
    bucket,
    breakdown: { lines, geoTier: tier, rule: bucket === "call" ? `≥ ${s.thresholds.call}: worth a call` : bucket === "watch" ? `≥ ${s.thresholds.watch}: watch` : `< ${s.thresholds.watch}: for information` },
  };
}

const SIGNAL_POINTS_LABEL: Record<Exclude<Extraction["signalType"], "policy_change" | "not_relevant">, string> = {
  partner_search: "Seeking NGO partners",
  new_initiative: "New initiative",
  increased_allocation: "More CSR money",
  other_csr: "Other CSR activity",
};

const GEO_LABEL = { home: "Pune / PCMC", priority: "Maharashtra", national: "Pan-India", other: "Other state", unknown: "Location not stated" } as const;
