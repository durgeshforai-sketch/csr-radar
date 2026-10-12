import { describe, expect, it } from "vitest";
import { canonicalUrl, cluster, companyKey, quoteFound, similarity, splitOutlet, withinWindow } from "@/lib/text";
import { parseGoogleNews, buildQueries } from "@/lib/sources";
import { prefilterReason } from "@/lib/pipeline";
import { inventedNumbers, journeyStage } from "@/lib/outreach";
import { DEFAULT_SETTINGS as S } from "@/lib/settings";

describe("cleaning", () => {
  it("canonicalises URLs: tracking params, www, amp, trailing slash", () => {
    expect(canonicalUrl("https://www.example.com/a/b/amp/?utm_source=x&id=2#top")).toBe(canonicalUrl("https://example.com/a/b?id=2"));
  });
  it("splits the outlet off Google News titles", () => {
    expect(splitOutlet("Zeta opens skilling centre - The Hindu")).toEqual({ title: "Zeta opens skilling centre", outlet: "The Hindu" });
  });
  it("merges the same story from different outlets, keeps different stories apart", () => {
    const a = "MediaTek & ThinkStartup launch Future Minds CSR program to train 6,000 youth";
    const b = "MediaTek, ThinkStartup launch 'Future Minds' CSR programme to train 6,000 underprivileged youth";
    const c = "Birla Group offers ₹5 crore CSR fund to Sangam ITI";
    expect(similarity(a, b)).toBeGreaterThan(0.5);
    expect(cluster([{ title: a }, { title: c }, { title: b }])).toHaveLength(2);
  });
  it("keeps only the 7-day window", () => {
    const start = new Date("2026-10-05T00:00:00Z");
    const end = new Date("2026-10-12T00:00:00Z");
    expect(withinWindow(new Date("2026-10-08"), start, end)).toBe(true);
    expect(withinWindow(new Date("2026-09-30"), start, end)).toBe(false);
    expect(withinWindow(new Date("invalid"), start, end)).toBe(false);
  });
  it("normalises company names for the CRM", () => {
    expect(companyKey("Kotak Mahindra Bank Ltd.")).toBe(companyKey("Kotak Mahindra Bank"));
    expect(companyKey("SBI Foundation")).toBe("sbi");
  });
});

describe("evidence verification", () => {
  const src = "Birla Group Offers ₹5 Crore CSR Fund To Sangam ITI For New Building. The grant will fund a new block.";
  it("accepts a verbatim quote, case and punctuation insensitive", () => {
    expect(quoteFound("birla group offers ₹5 crore csr fund", src)).toBe(true);
  });
  it("rejects a quote that is not in the source", () => {
    expect(quoteFound("Birla Group seeks NGO partners in Pune", src)).toBe(false);
  });
});

describe("sources", () => {
  it("parses a Google News RSS item", () => {
    const xml = `<rss><channel><item><title>Zeta opens centre - The Hindu</title><link>https://news.google.com/x</link><pubDate>Fri, 09 Oct 2026 08:00:00 GMT</pubDate><description>&lt;a&gt;Zeta opens centre&lt;/a&gt;</description><source url="https://thehindu.com">The Hindu</source></item></channel></rss>`;
    const [it] = parseGoogleNews(xml, "q");
    expect(it.title).toBe("Zeta opens centre");
    expect(it.outlet).toBe("The Hindu");
    expect(it.publishedAt.toISOString()).toBe("2026-10-09T08:00:00.000Z");
  });
  it("builds searches from settings, so a new sector is searched next run", () => {
    const s = { ...S, sectors: [...S.sectors, { key: "women", label: "Women", keywords: ["women", "self-help group"], enabled: true }] };
    expect(buildQueries(s).some((q) => q.includes("self-help group"))).toBe(true);
  });
  it("pre-filter drops adverts but keeps CSR stories", () => {
    expect(prefilterReason({ title: "Best Cybersecurity Course with Placement in Thane", snippet: "" }, S)).toMatch(/advert/);
    expect(prefilterReason({ title: "AM/NS India empowers Odisha youth through digital skill development", snippet: "" }, S)).toBeNull();
  });
});

describe("outreach guardrails", () => {
  it("flags numbers in the email that are not in the story or profile", () => {
    expect(inventedNumbers("We placed 500 youth last year. Train 6,000 youth.", "train 6,000 underprivileged youth")).toEqual(["500"]);
    expect(inventedNumbers("Could we have a 20-minute call?", "")).toEqual([]);
  });
  it("buyer journey stage follows the signal", () => {
    expect(journeyStage({ signalType: "partner_search", stage: "announced", partnerSearchExplicit: true }).stage).toBe("decision");
    expect(journeyStage({ signalType: "new_initiative", stage: "launched", partnerSearchExplicit: false }).stage).toBe("consideration");
    expect(journeyStage({ signalType: "new_initiative", stage: "completed", partnerSearchExplicit: false }).stage).toBe("post_purchase");
    expect(journeyStage({ signalType: "increased_allocation", stage: "announced", partnerSearchExplicit: false }).stage).toBe("awareness");
  });
});
