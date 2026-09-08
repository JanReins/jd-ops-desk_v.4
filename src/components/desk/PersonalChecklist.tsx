import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useData } from "@/lib/ops/data-context";
import { daysOverdue, formatAuShort, getMelbourneToday } from "@/lib/ops/dates";
import type { PersonalTaskStatus } from "@/lib/ops/types";

export function PersonalChecklist() {
  const { personalTasks, updatePersonalTask, addPersonalTask } = useData();
  const today = getMelbourneToday();
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const open = personalTasks.filter((t) => t.status !== "Done");
  const done = personalTasks.filter((t) => t.status === "Done");

  const cycle = async (id: string, status: PersonalTaskStatus) => {
    const next: PersonalTaskStatus =
      status === "Not started" ? "In progress" : status === "In progress" ? "Done" : "Not started";
    await updatePersonalTask(id, { status: next });
  };

  const handleAdd = async () => {
    const task = draft.trim();
    if (!task) return;
    await addPersonalTask({
      category: "To do",
      task,
      dueDate: "",
      status: "Not started",
      notes: "",
      order: personalTasks.length + 1,
    });
    setDraft("");
    setAdding(false);
  };

  return (
    <section className="rounded-lg border border-line bg-surface p-3.5 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold tracking-tight text-ink">Personal checklist</h3>
          <p className="text-2xs text-muted">
            {open.length} open · {done.length} done — kept off the client ledger
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:bg-paper hover:text-ink"
          aria-label="Add personal task"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {adding && (
        <div className="mb-2 flex gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="New personal item"
            className="min-h-9 flex-1 rounded-md border border-line bg-raised px-2 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            className="rounded-md bg-accent px-2.5 text-2xs font-semibold text-accent-fg"
          >
            Add
          </button>
        </div>
      )}

      <ul className="space-y-1">
        {personalTasks.map((task) => {
          const overdue = task.status !== "Done" && task.dueDate && daysOverdue(task.dueDate, today) > 0;
          return (
            <li key={task.id} className="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-paper">
              <button
                type="button"
                onClick={() => void cycle(task.id, task.status)}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                  task.status === "Done"
                    ? "border-ok bg-ok text-ok-soft"
                    : task.status === "In progress"
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-raised"
                }`}
                aria-label={`Mark ${task.task}`}
              >
                {task.status === "Done" && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-xs ${
                    task.status === "Done" ? "text-subtle line-through" : "font-medium text-ink"
                  }`}
                >
                  {task.task}
                </div>
                <div className="text-2xs text-muted">
                  {task.category}
                  {task.dueDate ? ` · ${formatAuShort(task.dueDate)}` : ""}
                  {overdue ? (
                    <span className="ml-1 font-semibold text-danger">overdue</span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
