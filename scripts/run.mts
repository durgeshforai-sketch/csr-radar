import { config } from "dotenv";
config({ path: ".env.local" });

// Run the full pipeline from the terminal: npm run pipeline [-- --email]
const { runPipeline } = await import("../src/lib/pipeline.ts");
const t = Date.now();
const r = await runPipeline({ trigger: "manual", sendEmail: process.argv.includes("--email") });
console.log(JSON.stringify(r, null, 2));
console.log(`done in ${Math.round((Date.now() - t) / 1000)}s`);
