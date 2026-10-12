import { describe, expect, it } from "vitest";
import { score, geoTier } from "@/lib/score";
import { DEFAULT_SETTINGS as S } from "@/lib/settings";
import type { Extraction } from "@/lib/extract";

const now = new Date("2026-10-12T06:00:00Z");
const base: Extraction = {
  id: 0,
  signalType: "new_initiative",
  company: "Acme",
  companyType: "private",
  sectors: ["skill_development"],
  places: ["Pune"],
  panIndia: false,
  amountInrCrore: null,
  amountText: null,
  audienceMatch: true,
  partnerSearchExplicit: false,
  deadline: null,
  stage: "launched",
  peopleNamed: [],
  evidence: "x",
  summary: "x",
  whyItMatters: "x",
  confidence: "high",
};
const ctx: { publishedAt: Date; now: Date; evidenceVerified: boolean; priorSignals: number; openCall?: boolean } = { publishedAt: new Date("2026-10-11T06:00:00Z"), now, evidenceVerified: true, priorSignals: 0 };
const run = (e: Partial<Extraction>, c: Partial<typeof ctx> = {}) => score({ ...base, ...e }, { ...ctx, ...c }, S);

describe("radar score", () => {
  it("a new skilling initiative in Pune for her audience is Hot", () => {
    const r = run({});
    expect(r.bucket).toBe("call");
    expect(r.score).toBeGreaterThanOrEqual(S.thresholds.call);
  });

  it("is fully explained: the breakdown adds up to the score", () => {
    const r = run({ amountInrCrore: 2 });
    expect(r.breakdown.lines.reduce((a, l) => a + l.points, 0)).toBe(r.score);
  });

  it("an explicit partner search is always Hot, even outside home geography", () => {
    const r = run({ signalType: "partner_search", partnerSearchExplicit: true, places: [], audienceMatch: false }, { publishedAt: new Date("2026-10-06T06:00:00Z") });
    expect(r.bucket).toBe("call");
    expect(r.breakdown.rule).toMatch(/partner search/i);
  });

  it("an unverified partner search does not get the override", () => {
    const r = run({ signalType: "partner_search", partnerSearchExplicit: true, places: ["Assam"], audienceMatch: false }, { evidenceVerified: false, publishedAt: new Date("2026-10-06T06:00:00Z") });
    expect(r.bucket).not.toBe("call");
  });

  it("off-sector stories are Cold but still scored, never dropped", () => {
    const r = run({ sectors: [] });
    expect(r.bucket).toBe("skip");
    expect(r.score).toBeLessThan(S.thresholds.watch);
    expect(r.breakdown.rule).toMatch(/outside her sectors/);
  });

  it("not-relevant stories are Cold with a low cap", () => {
    const r = run({ signalType: "not_relevant" });
    expect(r.bucket).toBe("skip");
    expect(r.score).toBeLessThanOrEqual(15);
  });

  it("an open call for NGO partners is always Hot, even off-sector or far away, and shows its deadline", () => {
    const r = run({ signalType: "partner_search", sectors: [], places: ["Assam"], audienceMatch: false, deadline: "2026-10-23" }, { openCall: true, publishedAt: new Date("2026-09-20T00:00:00Z") });
    expect(r.bucket).toBe("call");
    expect(r.score).toBeGreaterThanOrEqual(S.thresholds.call);
    expect(r.breakdown.rule).toMatch(/Open call.*2026-10-23/);
  });

  it("an open call from a government research body is not auto-Hot (only corporate CSR money is)", () => {
    const r = run({ signalType: "partner_search", companyType: "government", sectors: [], places: ["Assam"], audienceMatch: false }, { openCall: true, publishedAt: new Date("2026-09-20T00:00:00Z") });
    expect(r.bucket).not.toBe("call");
  });

  it("policy changes always go to Policy watch", () => {
    expect(run({ signalType: "policy_change", sectors: [] }).bucket).toBe("policy");
  });

  it("a completed project and an unverified quote are penalised", () => {
    const clean = run({}).score;
    expect(run({ stage: "completed" }).score).toBe(clean - S.weights.completedPenalty);
    expect(run({}, { evidenceVerified: false }).score).toBe(clean - S.weights.unverifiedPenalty);
  });

  it("older stories score lower than fresh ones", () => {
    expect(run({}, { publishedAt: new Date("2026-10-05T06:00:00Z") }).score).toBeLessThan(run({}).score);
  });

  it("a company that already signalled is warming", () => {
    const r = run({ places: ["Assam"] }, { priorSignals: 2 });
    expect(r.breakdown.lines.some((l) => /Warming/.test(l.label))).toBe(true);
  });

  it("changing a weight in settings changes the decision", () => {
    const strict = { ...S, thresholds: { call: 99, watch: 95 } };
    expect(score(base, ctx, strict).bucket).toBe("fyi");
  });
});

describe("geography tiers come from settings", () => {
  it("maps places to home / priority / national / other", () => {
    expect(geoTier({ places: ["Hinjewadi, Pune"], panIndia: false }, S)).toBe("home");
    expect(geoTier({ places: ["Nagpur"], panIndia: false }, S)).toBe("priority");
    expect(geoTier({ places: [], panIndia: true }, S)).toBe("national");
    expect(geoTier({ places: ["Odisha"], panIndia: false }, S)).toBe("other");
    expect(geoTier({ places: [], panIndia: false }, S)).toBe("unknown");
  });
});
