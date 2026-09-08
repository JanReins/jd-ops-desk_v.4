import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { useData } from "@/lib/ops/data-context";
import { askDeskGrok, compactDeskContext, type DeskChatTurn } from "@/lib/ops/desk-chat";

const SUGGESTIONS = [
  "What should I sit first this morning?",
  "Summarise leftover in my court",
  "Who is waiting on client?",
];

type Props = {
  onClose: () => void;
};

export function DeskChat({ onClose }: Props) {
  const { clients, obligations } = useData();
  const [turns, setTurns] = useState<DeskChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const deskContext = useMemo(() => compactDeskContext(clients, obligations), [clients, obligations]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    const previousTurns = turns;
    const nextTurns: DeskChatTurn[] = [...previousTurns, { role: "user", content: prompt }];
    setTurns(nextTurns);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const result = await askDeskGrok({ data: { messages: nextTurns, deskContext } });
      if (!result.ok) {
        setError(result.error);
        setTurns(previousTurns);
        setDraft(prompt);
        return;
      }
      setTurns([...nextTurns, { role: "assistant", content: result.text || "No reply." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Grok Fast.");
      setTurns(previousTurns);
      setDraft(prompt);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  return (
    <div className="fixed inset-0 z-modal flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Ask desk"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold tracking-tight text-ink">Ask desk</h2>
            </div>
            <p className="mt-0.5 text-2xs text-muted">Grok Fast · this sitting’s ledger goes with the question</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted hover:bg-paper hover:text-ink"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {turns.length === 0 && (
            <div className="rounded-lg border border-line bg-paper px-3 py-3">
              <p className="text-xs text-ink">Ask about today’s plan, leftover, or who to chase. Replies stay short.</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-md border border-line bg-surface px-2.5 py-2 text-left text-2xs font-medium text-ink hover:border-accent/40 hover:bg-accent-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((turn, i) => (
            <div
              key={`${turn.role}-${i}`}
              className={
                turn.role === "user"
                  ? "ml-8 rounded-lg bg-accent px-3 py-2 text-xs leading-relaxed text-accent-fg"
                  : "mr-4 rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink"
              }
            >
              <div className="mb-1 text-2xs font-semibold uppercase tracking-wider opacity-70">
                {turn.role === "user" ? "You" : "Desk"}
              </div>
              <div className="whitespace-pre-wrap">{turn.content}</div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-2xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Asking Grok Fast…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-2xs text-danger">{error}</div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-3">
          <label className="sr-only" htmlFor="desk-chat-input">
            Question
          </label>
          <textarea
            id="desk-chat-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={3}
            placeholder="Ask about today, leftover, a client…"
            className="w-full resize-none rounded-md border border-line bg-raised px-3 py-2 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-2xs text-subtle">Enter to send · Shift+Enter for a line</p>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-2xs font-semibold text-accent-fg disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
