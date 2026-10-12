import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync, writeFileSync } from "node:fs";

// Extraction eval: 36 real headlines labelled by hand (eval/labels.json) vs a fresh Gemini read.
// Classes: opportunity (initiative / partner search / allocation in her sectors), policy, other (CSR but not for her), not_relevant.
const { getDb, schema } = await import("../src/db/index.ts");
const { inArray } = await import("drizzle-orm");
const { extractBatch } = await import("../src/lib/extract.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/settings.ts");
const { Usage } = await import("../src/lib/gemini.ts");

type L = "opportunity" | "policy" | "other" | "not_relevant";
const labels = JSON.parse(readFileSync("eval/labels.json", "utf8")) as { title: string; label: L }[];
const rows = await getDb().select().from(schema.articles).where(inArray(schema.articles.title, labels.map((l) => l.title)));
const items = labels.map((l) => rows.find((r) => r.title === l.title) ?? { title: l.title, outlet: null, snippet: null, publishedAt: new Date() });

const usage = new Usage();
const out: Awaited<ReturnType<typeof extractBatch>> = [];
for (let i = 0; i < items.length; i += 10) out.push(...(await extractBatch(items.slice(i, i + 10), DEFAULT_SETTINGS, usage)));

const toClass = (e: (typeof out)[number]): L =>
  !e ? "not_relevant" : e.signalType === "policy_change" ? "policy" : e.signalType === "not_relevant" ? "not_relevant" : ["new_initiative", "partner_search", "increased_allocation"].includes(e.signalType) && e.sectors.length ? "opportunity" : "other";

const classes: L[] = ["opportunity", "policy", "other", "not_relevant"];
const matrix = Object.fromEntries(classes.map((c) => [c, Object.fromEntries(classes.map((d) => [d, 0]))])) as Record<L, Record<L, number>>;
const misses: string[] = [];
labels.forEach((l, i) => {
  const got = toClass(out[i]);
  matrix[l.label][got]++;
  if (got !== l.label) misses.push(`| ${l.title.slice(0, 80)} | ${l.label} | ${got} (${out[i]?.signalType}) |`);
});
const correct = classes.reduce((a, c) => a + matrix[c][c], 0);
const opp = { tp: matrix.opportunity.opportunity, fn: classes.filter((c) => c !== "opportunity").reduce((a, c) => a + matrix.opportunity[c], 0), fp: classes.filter((c) => c !== "opportunity").reduce((a, c) => a + matrix[c].opportunity, 0) };
const relevantOk = labels.filter((l, i) => (l.label === "not_relevant") === (toClass(out[i]) === "not_relevant")).length;

const md = `# Extraction eval

Run ${new Date().toISOString().slice(0, 16)} · model ${process.env.GEMINI_MODEL} · ${labels.length} real headlines from the live feeds, labelled by hand.

| Metric | Result |
|---|---|
| 4-class accuracy | **${correct}/${labels.length} (${Math.round((correct / labels.length) * 100)}%)** |
| Opportunity recall (missed openings) | **${opp.tp}/${opp.tp + opp.fn}** |
| Opportunity precision | ${opp.tp}/${opp.tp + opp.fp} |
| Relevant vs not-relevant | ${relevantOk}/${labels.length} |
| Gemini cost for this eval | $${usage.costUsd.toFixed(4)} |

Recall matters most: a missed opening is the failure Ananya described. A false positive costs her a minute; and because nothing is hidden (Cold is listed), a misclassified story is still on her screen.

## Confusion matrix (rows = human label, columns = model)

| | ${classes.join(" | ")} |
|---|${classes.map(() => "---").join("|")}|
${classes.map((c) => `| **${c}** | ${classes.map((d) => matrix[c][d]).join(" | ")} |`).join("\n")}

## Disagreements

| Headline | Human | Model |
|---|---|---|
${misses.join("\n") || "| — | — | — |"}
`;
writeFileSync("eval/results.md", md);
console.log(md);
