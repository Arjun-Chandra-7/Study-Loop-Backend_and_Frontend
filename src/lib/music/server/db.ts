import "server-only";
import { neon } from "@neondatabase/serverless";
import { ApiError } from "./http";
import { log } from "./log";
import { SCHEMA } from "./schema";

export type Row = Record<string, unknown>;
export interface Executor {
  query(text: string, params: unknown[]): Promise<Row[]>;
  batch(statements: { text: string; params: unknown[] }[]): Promise<void>;
}

let executor: Executor | null = null;
let ready: Promise<void> | null = null;

function neonExecutor(url: string): Executor {
  const sql = neon(url);
  return {
    query: async (text, params) => (await sql.query(text, params)) as Row[],
    batch: async (statements) => {
      await sql.transaction(statements.map((s) => sql.query(s.text, s.params)));
    },
  };
}

export function setExecutorForTests(e: Executor | null) {
  executor = e;
  ready = null;
}

const unavailable = () =>
  new ApiError(503, "storage_unavailable", "Your music library isn't available right now. Try again shortly.");

async function db(): Promise<Executor> {
  if (!executor) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      log("storage_failed", { reason: "DATABASE_URL not set" });
      throw unavailable();
    }
    executor = neonExecutor(url);
  }
  const e = executor;
  ready ??= (async () => {
    for (const stmt of SCHEMA) await e.query(stmt, []);
  })().catch((err) => {
    ready = null;
    log("storage_failed", { stage: "schema", error: (err as Error).name, detail: (err as Error).message });
    throw unavailable();
  });
  await ready;
  return e;
}

export function numbered(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

async function run(text: string, params: unknown[]): Promise<Row[]> {
  const e = await db();
  try {
    return await e.query(numbered(text), params);
  } catch (err) {
    const code = (err as { code?: string }).code;

    if (code?.startsWith("23")) throw err;
    log("storage_failed", { stage: "query", error: (err as Error).name, code, detail: (err as Error).message });
    throw unavailable();
  }
}

export const q = {
  async get<T>(text: string, ...params: unknown[]): Promise<T | undefined> {
    return (await run(text, params))[0] as T | undefined;
  },
  async all<T>(text: string, ...params: unknown[]): Promise<T[]> {
    return (await run(text, params)) as T[];
  },
  async run(text: string, ...params: unknown[]): Promise<Row[]> {
    return run(text, params);
  },

  async batch(statements: [string, ...unknown[]][]): Promise<void> {
    const e = await db();
    await e.batch(statements.map(([text, ...params]) => ({ text: numbered(text), params })));
  },
};

export const isUniqueViolation = (err: unknown) => (err as { code?: string }).code === "23505";

export const newId = () => crypto.randomUUID().replaceAll("-", "");
