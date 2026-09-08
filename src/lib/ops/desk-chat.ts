import { createServerFn } from "@tanstack/react-start";
import type { Client, Obligation } from "./types";
import { WORKSTREAM_LABELS } from "./types";
import { formatMelbourneMonthYear, getMelbourneCurrentPeriod, getMelbourneToday } from "./dates";
import { getBacklog, getTodaySet, isOpenStatus, sortTodayStack } from "./todaySet";
import { METKA_ENTITIES, listMetkaPacks, shortEntityName } from "./metka";

export type DeskChatTurn = { role: "user" | "assistant"; content: string };

const MODEL_PRIMARY = "grok-4-fast-non-reasoning";
const MODEL_FALLBACK = "grok-4-1-fast-non-reasoning";
const MAX_HISTORY = 8;
const MAX_OUTPUT_TOKENS = 700;
const MAX_USER_CHARS = 2000;
const MAX_CONTEXT_CHARS = 4500;
const FETCH_MS = 25000;

function lineFor(ob: Obligation, clientMap: Map<string, Client>): string {
  const client = clientMap.get(ob.clientId);
  const name = ob.entityName ? shortEntityName(ob.entityName) : client?.shortName || "—";
  const action = (ob.nextAction || ob.taskLabel || WORKSTREAM_LABELS[ob.workstream]).slice(0, 80);
  const due = ob.dueDate || "no due";
  const week = ob.weekCode ? ` ${ob.weekCode}` : "";
  return `${name} · ${action} · ${ob.status} · ${ob.priority} · ${due}${week}`;
}

export function compactDeskContext(clients: Client[], obligations: Obligation[]): string {
  const today = getMelbourneToday();
  const period = getMelbourneCurrentPeriod();
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const plan = sortTodayStack(getTodaySet(obligations, today)).filter((o) => isOpenStatus(o.status));
  const backlog = getBacklog(obligations, today, period);
  const waiting = obligations
    .filter(
      (o) =>
        isOpenStatus(o.status) &&
        o.workstream !== "metka_bas" &&
        (o.status === "Waiting on client" || o.status === "Blocked"),
    )
    .slice(0, 12);
  const lines = [
    `Melbourne today: ${today}`,
    `Period: ${formatMelbourneMonthYear(period)} (${period})`,
    `Open obligations: ${obligations.filter((o) => isOpenStatus(o.status)).length}`,
    `Today plan (${plan.length}):`,
    ...(plan.length ? plan.slice(0, 12).map((o) => `- ${lineFor(o, clientMap)}`) : ["- empty"]),
    `Leftover/overdue not on plan: ${backlog.all.length} (${backlog.mineCount} my court, ${backlog.theirsCount} watching, ${backlog.overdueCount} overdue)`,
    ...backlog.all.slice(0, 18).map((o) => `- ${lineFor(o, clientMap)}`),
    `Waiting / blocked (${waiting.length} shown):`,
    ...(waiting.length ? waiting.map((o) => `- ${lineFor(o, clientMap)}`) : ["- none"]),
    `Metka entity pack (${METKA_ENTITIES.length} entities, one client):`,
    ...(listMetkaPacks(obligations).length
      ? listMetkaPacks(obligations).map(
          (p) =>
            `- ${formatMelbourneMonthYear(p.periodStart)}: ${p.done}/${METKA_ENTITIES.length} done, ${p.open} open, ${p.ready} ready, ${p.missing} missing`,
        )
      : ["- none"]),
  ];
  const text = lines.join("\n");
  return text.length > MAX_CONTEXT_CHARS ? `${text.slice(0, MAX_CONTEXT_CHARS)}\n…truncated` : text;
}

const SYSTEM = `You are the ops-desk assistant for Jan, a Melbourne accountant. Answer from the ledger snapshot only. Be short and practical: what to sit, what to chase, what is leftover. Do not invent lodgements, amounts, or clients. If the snapshot is silent, say so. Prefer next actions and client short names. Melbourne dates.`;

function sanitizeTurns(raw: unknown): DeskChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: DeskChatTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    const content = typeof rec.content === "string" ? rec.content.trim() : "";
    if (!role || !content) continue;
    out.push({ role, content: content.slice(0, MAX_USER_CHARS) });
  }
  return out;
}

async function complete(apiKey: string, model: string, messages: { role: string; content: string }[]) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages,
      }),
      signal: ctrl.signal,
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!res.ok) {
      return { ok: false as const, status: res.status, error: body.error?.message || `xAI API error ${res.status}` };
    }
    return { ok: true as const, text: body.choices?.[0]?.message?.content?.trim() || "" };
  } finally {
    clearTimeout(timer);
  }
}

export const askDeskGrok = createServerFn({ method: "POST" })
  .validator((input: { messages: DeskChatTurn[]; deskContext: string }) => ({
    messages: sanitizeTurns(input?.messages),
    deskContext: typeof input?.deskContext === "string" ? input.deskContext.slice(0, MAX_CONTEXT_CHARS) : "",
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available in this environment." };
    const last = data.messages[data.messages.length - 1];
    if (!last || last.role !== "user") return { ok: false as const, error: "Ask a question first." };

    const messages = [
      { role: "system", content: SYSTEM },
      ...data.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `Ledger snapshot:\n${data.deskContext || "(empty)"}\n\nQuestion:\n${last.content}`,
      },
    ];

    try {
      const first = await complete(apiKey, MODEL_PRIMARY, messages);
      if (first.ok) return { ok: true as const, text: first.text, model: MODEL_PRIMARY };
      if (first.status === 400 || first.status === 404) {
        const second = await complete(apiKey, MODEL_FALLBACK, messages);
        if (second.ok) return { ok: true as const, text: second.text, model: MODEL_FALLBACK };
        return { ok: false as const, error: second.error };
      }
      return { ok: false as const, error: first.error };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return { ok: false as const, error: aborted ? "Grok Fast timed out. Try a shorter question." : "Could not reach Grok Fast." };
    }
  });
