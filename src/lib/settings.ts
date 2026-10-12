import { z } from "zod";

// Ananya's configuration. Edited on /settings, read by every run.
// Sectors and geographies grow with her programme footprint, so nothing here is hard-coded in the pipeline.

export const Sector = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(1),
  keywords: z.array(z.string().min(2)).min(1),
  enabled: z.boolean(),
});

export const GeoTier = z.enum(["home", "priority", "national"]);
export const Geography = z.object({
  tier: GeoTier,
  label: z.string().min(1),
  terms: z.array(z.string().min(2)),
});

export const Weights = z.object({
  partner_search: z.number().min(0).max(60),
  new_initiative: z.number().min(0).max(60),
  increased_allocation: z.number().min(0).max(60),
  other_csr: z.number().min(0).max(60),
  sectorFit: z.number().min(0).max(40),
  audienceFit: z.number().min(0).max(30), // beneficiaries overlap with her programmes' audience
  geoHome: z.number().min(0).max(40),
  geoPriority: z.number().min(0).max(40),
  geoNational: z.number().min(0).max(40),
  geoOther: z.number().min(0).max(40),
  amountLarge: z.number().min(0).max(30), // ≥ ₹10 Cr stated
  amountAny: z.number().min(0).max(30),
  recency: z.number().min(0).max(20), // ≤ 2 days old; scales down to 0 at 7 days
  warming: z.number().min(0).max(20), // company already signalled in the last 90 days
  completedPenalty: z.number().min(0).max(30), // money already spent (inauguration of a finished project)
  unverifiedPenalty: z.number().min(0).max(30), // evidence quote not found in the source text
});

export const Settings = z.object({
  organisation: z.object({
    name: z.string(),
    city: z.string(),
    programmes: z.string(), // the only facts outreach drafts may claim about the NGO
    proofPoints: z.array(z.string()), // real outcomes Ananya enters; drafts never invent numbers
    senderName: z.string(),
  }),
  sectors: z.array(Sector).min(1),
  geographies: z.array(Geography),
  weights: Weights,
  thresholds: z.object({ call: z.number().min(0).max(100), watch: z.number().min(0).max(100) }),
  recipients: z.array(z.string().email()),
  windowDays: z.number().int().min(1).max(30),
});
export type Settings = z.infer<typeof Settings>;
export type Sector = z.infer<typeof Sector>;
export type GeoTier = z.infer<typeof GeoTier>;

export const DEFAULT_SETTINGS: Settings = {
  organisation: {
    name: "Ananya's NGO",
    city: "Pune",
    programmes:
      "Skilling programmes for school dropouts and first-generation job seekers in Pune: employability, digital skills, vocational training and placement support for youth aged 16–25.",
    proofPoints: [],
    senderName: "Ananya",
  },
  sectors: [
    {
      key: "education",
      label: "Education",
      keywords: ["education", "school", "schools", "students", "learning", "scholarship", "teacher", "classroom", "literacy"],
      enabled: true,
    },
    {
      key: "skill_development",
      label: "Skill development",
      keywords: ["skill", "skilling", "skills", "vocational", "ITI", "apprentice", "training centre", "upskilling", "employability"],
      enabled: true,
    },
    {
      key: "digital_literacy",
      label: "Digital literacy",
      keywords: ["digital literacy", "digital skills", "computer lab", "coding", "STEM", "AI skills", "tech education", "robotics"],
      enabled: true,
    },
    {
      key: "youth_employment",
      label: "Youth employment",
      keywords: ["youth", "livelihood", "placement", "jobs", "job seekers", "first-generation", "dropouts", "unemployed", "employment"],
      enabled: true,
    },
  ],
  geographies: [
    { tier: "home", label: "Pune & PCMC", terms: ["Pune", "PCMC", "Pimpri", "Chinchwad", "Hinjewadi", "Chakan", "Baramati", "Talegaon", "Kharadi", "Hadapsar"] },
    {
      tier: "priority",
      label: "Maharashtra",
      terms: ["Maharashtra", "Mumbai", "Thane", "Navi Mumbai", "Nashik", "Nagpur", "Aurangabad", "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur", "Satara", "Ahmednagar"],
    },
    { tier: "national", label: "Pan-India", terms: ["India", "pan-India", "nationwide", "across India", "multiple states"] },
  ],
  weights: {
    partner_search: 40,
    new_initiative: 30,
    increased_allocation: 25,
    other_csr: 10,
    sectorFit: 20,
    audienceFit: 10,
    geoHome: 20,
    geoPriority: 14,
    geoNational: 10,
    geoOther: 5,
    amountLarge: 10,
    amountAny: 5,
    recency: 10,
    warming: 5,
    completedPenalty: 12,
    unverifiedPenalty: 10,
  },
  thresholds: { call: 62, watch: 42 },
  recipients: [],
  windowDays: 7,
};
