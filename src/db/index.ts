import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof make> | null = null;
function make(url: string) {
  return drizzle({ client: neon(url), schema, casing: "snake_case" });
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return (cached ??= make(url));
}

export { schema };
