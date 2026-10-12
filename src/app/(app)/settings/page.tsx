import { connection } from "next/server";
import { loadSettings } from "@/lib/settings-store";
import { updateSettings } from "@/app/actions/settings";
import { SubmitButton } from "@/components/copy-button";
import { RunNow } from "@/components/run-now";

const W: [string, string][] = [
  ["partner_search", "Seeking NGO partners"], ["new_initiative", "New initiative"], ["increased_allocation", "More CSR money"], ["other_csr", "Other CSR activity"],
  ["sectorFit", "In her sectors"], ["audienceFit", "Serves her audience"], ["geoHome", "Home city"], ["geoPriority", "Priority state"], ["geoNational", "Pan-India"], ["geoOther", "Other state"],
  ["amountLarge", "₹10 Cr+ stated"], ["amountAny", "Any amount stated"], ["recency", "Freshness (max)"], ["warming", "Company warming"], ["completedPenalty", "Penalty: already completed"], ["unverifiedPenalty", "Penalty: quote not verified"],
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const s = await loadSettings();
  return (
    <form action={updateSettings}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Configuration</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Settings</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>Sectors, regions and weights drive the searches and the score on the next run. Grow them as your programme footprint grows.</p>
        </div>
        <div className="row">
          {sp.saved && <span className="chip ok">✓ Saved — applies from the next run</span>}
          <SubmitButton className="btn primary" pendingText="Saving…">Save settings</SubmitButton>
        </div>
      </div>
      {sp.error && <div className="alert warn" style={{ marginBottom: 16 }}>{sp.error}</div>}

      <div className="stack" style={{ gap: 20 }}>
        <section className="card pad-lg stack">
          <h2 className="h3">Your organisation <span className="muted small" style={{ fontWeight: 400 }}>— the only facts outreach drafts may use</span></h2>
          <div className="form-grid">
            <label className="field">Name<input name="org_name" defaultValue={s.organisation.name} /></label>
            <label className="field">Home city<input name="org_city" defaultValue={s.organisation.city} /></label>
            <label className="field">Sender name<input name="org_sender" defaultValue={s.organisation.senderName} /></label>
          </div>
          <label className="field">Programmes & audience<textarea name="org_programmes" defaultValue={s.organisation.programmes} /></label>
          <label className="field">Proof points <span className="hint">One per line, real outcomes only (e.g. “72% placement rate in 2025”). Drafts never invent numbers.</span><textarea name="org_proof" defaultValue={s.organisation.proofPoints.join("\n")} placeholder="Leave empty until you have verified outcomes" /></label>
        </section>

        <section className="card pad-lg stack">
          <h2 className="h3">Focus sectors</h2>
          {s.sectors.map((x, i) => (
            <div key={x.key} className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <label className="check" style={{ width: 24, marginTop: 8 }}><input type="checkbox" name={`sector_${i}_enabled`} defaultChecked={x.enabled} /></label>
              <label className="field" style={{ width: 200 }}>Label<input name={`sector_${i}_label`} defaultValue={x.label} /></label>
              <label className="field" style={{ flex: 1, minWidth: 260 }}>Keywords <span className="hint">comma-separated; the first three are searched</span><input name={`sector_${i}_keywords`} defaultValue={x.keywords.join(", ")} /></label>
            </div>
          ))}
          <div className="row" style={{ alignItems: "flex-start", gap: 12, paddingTop: 10, borderTop: "1px dashed var(--line-2)" }}>
            <span style={{ width: 24, marginTop: 30, fontWeight: 700 }}>+</span>
            <label className="field" style={{ width: 200 }}>New sector<input name="new_sector_label" placeholder="e.g. Women's livelihoods" /></label>
            <label className="field" style={{ flex: 1, minWidth: 260 }}>Keywords<input name="new_sector_keywords" placeholder="e.g. women, self-help group, livelihood" /></label>
          </div>
        </section>

        <section className="card pad-lg stack">
          <h2 className="h3">Geographic priorities</h2>
          {s.geographies.map((g, i) => (
            <div key={g.tier} className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <span className="chip brand" style={{ width: 90, justifyContent: "center", marginTop: 26 }}>{g.tier}</span>
              <label className="field" style={{ width: 180 }}>Label<input name={`geo_${i}_label`} defaultValue={g.label} /></label>
              <label className="field" style={{ flex: 1, minWidth: 260 }}>Places <span className="hint">comma-separated</span><input name={`geo_${i}_terms`} defaultValue={g.terms.join(", ")} /></label>
            </div>
          ))}
        </section>

        <section className="card pad-lg stack">
          <h2 className="h3">Scoring weights <span className="muted small" style={{ fontWeight: 400 }}>— points added to the 0–100 radar score</span></h2>
          <div className="form-grid">
            {W.map(([k, l]) => (
              <label key={k} className="field">{l}<input type="number" name={`w_${k}`} defaultValue={(s.weights as Record<string, number>)[k]} min={0} max={60} /></label>
            ))}
          </div>
          <div className="form-grid">
            <label className="field">Hot threshold (worth a call)<input type="number" name="t_call" defaultValue={s.thresholds.call} min={0} max={100} /></label>
            <label className="field">Warm threshold<input type="number" name="t_watch" defaultValue={s.thresholds.watch} min={0} max={100} /></label>
            <label className="field">Look-back window (days)<input type="number" name="windowDays" defaultValue={s.windowDays} min={1} max={30} /></label>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>Rule that always applies: an explicit search for NGO partners in your sectors is Hot, whatever the score.</p>
        </section>

        <section className="card pad-lg stack">
          <h2 className="h3">Monday digest</h2>
          <label className="field">Recipients <span className="hint">comma-separated emails; the digest lists only Hot companies and links back here</span><input name="recipients" defaultValue={s.recipients.join(", ")} placeholder={process.env.DIGEST_RECIPIENT ?? "ananya@example.org"} /></label>
          <div className="row"><span className="small muted">Send the digest now with today&apos;s data:</span><RunNow email /></div>
        </section>
      </div>
    </form>
  );
}
