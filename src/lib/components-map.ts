// The components map as data: actors × Trigger…Output, numbered in the order a daily run happens.
// Rendered on /map in the app's theme. **text** marks bold.

export type StepKind = "ai" | "code" | "data" | "person";

export const MAP_COLUMNS = ["Trigger", "Input", "Context", "Processing", "AI", "Output"] as const;

export const MAP_ACTORS: { name: string; role: string }[] = [
  { name: "Ananya", role: "Head of Corporate Partnerships · Pune NGO" },
  { name: "Scheduler", role: "Vercel Cron" },
  { name: "News feeds", role: "Google News · Bing News · CSR trade press" },
  { name: "Pipeline", role: "Next.js 16 on Vercel" },
  { name: "LLM", role: "Gemini 3.7 Flash · OpenRouter · Google providers only" },
  { name: "Database", role: "Neon Postgres" },
  { name: "Web", role: "Company & CSR pages · CSR Exchange portal" },
  { name: "Email", role: "Resend" },
];

export type MapStep = { id: string; actor: number; col: number; kind: StepKind; text: string };

export const MAP_STEPS: MapStep[] = [
  { id: "0", actor: 0, col: 0, kind: "person", text: "Clicks **Refresh now** on the dashboard, or **Run & email digest** in Settings. Examiners: one-click **Enter as examiner**." },
  { id: "T", actor: 0, col: 2, kind: "person", text: "Edits **Settings**: sectors & keywords, regions (Pune → Maharashtra → India), 16 scoring weights, thresholds, NGO profile & verified proof points, recipients. No code, no deploy." },
  { id: "18", actor: 0, col: 5, kind: "person", text: "Reads the Monday email and the dashboard, opens a brief, **edits and sends outreach herself**, moves the deal and logs calls in the CRM. Nothing is ever sent to a company by the system." },
  { id: "1", actor: 1, col: 0, kind: "data", text: "Daily 02:00 UTC = **07:30 IST**, bearer secret. Mondays → digest email. Runs stuck >10 min are reaped." },
  { id: "2", actor: 3, col: 0, kind: "code", text: "One run at a time. Returns at once, continues in **after()** (300 s budget). Every stage writes its counts → live progress bar and Runs page." },
  { id: "3", actor: 2, col: 1, kind: "data", text: "**Google News**: ~15 searches built from settings (7 days) + 3 policy searches (**30 days**). **Bing News**: 14 keyword searches. **India CSR, The CSR Journal, The CSR Universe** feeds." },
  { id: "4", actor: 4, col: 4, kind: "ai", text: "**Search** (native Google Search): proposes open CSR **RFPs / EOIs** (last 30 days, deadline open, corporate funders only) and headlines the feeds missed." },
  { id: "5", actor: 6, col: 1, kind: "data", text: "**Verify**: an open-call page must load and name the funder; an AI-found headline must match a real Google News article. Otherwise dropped." },
  { id: "6", actor: 3, col: 3, kind: "code", text: "**Clean**: time windows, canonical URLs, stored once; same story from other outlets merged into one card; free pre-filter drops adverts → listed as **Cold** with the reason." },
  { id: "7", actor: 5, col: 2, kind: "data", text: "Settings read fresh every run · each story's reading **cached** (never paid twice) · 90-day company history → “warming”." },
  { id: "8", actor: 4, col: 4, kind: "ai", text: "**Read**: 10 stories per call → signal, company, sectors, places, ₹, deadline, partner search, audience fit + **verbatim quote**. JSON schema, temp 0. Decides nothing." },
  { id: "9", actor: 3, col: 3, kind: "code", text: "**Verify quote**: it must appear in the source text, else −10 and no override." },
  { id: "10", actor: 3, col: 3, kind: "code", text: "**Radar score** 0–100 from her weights → Hot · Warm · Cool · Cold · Policy. Open calls (corporate CSR) and explicit partner searches are **always Hot**." },
  { id: "11", actor: 4, col: 4, kind: "ai", text: "**Contact**: spokesperson named in the story, else Google Search for the CSR head, kept only with a source. **Never guesses emails.**" },
  { id: "12", actor: 4, col: 4, kind: "ai", text: "**Draft**: buyer-journey stage (set by code) → JTBD, facts vs assumptions, Hook · Pain · Value · CTA, follow-up with a new angle." },
  { id: "13", actor: 3, col: 3, kind: "code", text: "**Guard**: any number in a draft that is not in the story or her NGO profile is flagged before she sees it." },
  { id: "14", actor: 4, col: 4, kind: "ai", text: "**Summary**: “the week in one minute” from the ranked facts only." },
  { id: "15", actor: 5, col: 5, kind: "data", text: "Stored: stories, signals, every run's funnel, source health, tokens & cost · **micro-CRM**: companies, contacts, deal stage, next steps, activity log." },
  { id: "16", actor: 3, col: 5, kind: "code", text: "**Dashboard**: Hot & Warm cards (open-call countdown), Policy watch (30 d), Cool, **every Cold story ranked**, briefs, pipeline board, Runs, How it works." },
  { id: "17", actor: 7, col: 5, kind: "data", text: "**Monday email** to her inbox: dashboard snapshot (signed PNG) + **only the Hot companies**, each linking to its brief." },
];

// Flow, in run order
export const MAP_LINKS: [string, string][] = [
  ["0", "2"], ["1", "2"], ["2", "3"], ["2", "4"], ["4", "5"], ["3", "6"], ["5", "6"], ["6", "8"], ["8", "9"], ["9", "10"],
  ["T", "7"], ["7", "10"], ["10", "11"], ["11", "12"], ["12", "13"], ["13", "14"], ["14", "15"], ["15", "16"], ["15", "17"], ["16", "18"], ["17", "18"],
];

export const KIND_LABEL: Record<StepKind, string> = {
  ai: "AI judgement (Gemini)",
  code: "Deterministic code",
  data: "Data, database & external services",
  person: "A person acts",
};
