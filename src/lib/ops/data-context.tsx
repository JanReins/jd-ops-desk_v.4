import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LOCAL_PRACTITIONER_ID,
  normalizeServices,
  type Client,
  type Obligation,
  type ObligationStatus,
  type PersonalTask,
  type Priority,
  type RecurringTemplate,
} from "./types";
import { DEMO_CLIENTS, DEMO_OBLIGATIONS, DEMO_PERSONAL_TASKS, SEED_VERSION } from "./seedData";
import { generateRollingHorizon, thisWeekBookWork, type CandidateObligation } from "./obligationGenerator";
import { getMelbourneToday, periodStartFromDate } from "./dates";
import { getTodaySet, isOpenStatus, TODAY_SOFT_CAP } from "./todaySet";
import { DEMO_TEMPLATES, nextDueForTemplate, templateAlreadyOpen } from "./templates";
import {
  openDatabase,
  getMeta,
  setMeta,
  getAllClients,
  getAllObligations,
  putClient,
  putObligation,
  deleteClient as deleteClientFromIdb,
  deleteObligation as deleteObligationFromIdb,
  batchPutObligations,
  clearUserData,
  seedInitialDemoData,
} from "./idb";
import { applySnapshot, type SnapshotData } from "./snapshot";
import { isGenericMetkaBas } from "./metka";

const UID = LOCAL_PRACTITIONER_ID;
const PERSONAL_KEY = `personalTasks:${UID}`;
const SEED_VERSION_KEY = `seedVersion:${UID}`;
const LAST_CLOSED_KEY = `lastClosedDate:${UID}`;
const TEMPLATES_KEY = `templates:${UID}`;
const METKA_PACK_KEY = `metkaPackV1:${UID}`;
const LAST_EXPORT_KEY = `lastExport:${UID}`;

export type CloseDayDecision = { id: string; action: "carry" | "park" };

interface DataContextType {
  clients: Client[];
  obligations: Obligation[];
  personalTasks: PersonalTask[];
  loading: boolean;
  error: string | null;
  p1Count: number;
  lastClosedDate: string | null;
  lastExportAt: string | null;
  markExported: () => Promise<void>;
  pinToToday: (id: string) => Promise<{ success: boolean; message?: string }>;
  unpinFromToday: (id: string) => Promise<void>;
  reorderTodayPlan: (orderedIds: string[]) => Promise<void>;
  closeDay: (decisions: CloseDayDecision[]) => Promise<void>;
  updateObligationStatus: (id: string, status: ObligationStatus) => Promise<void>;
  batchUpdateObligationStatus: (ids: string[], status: ObligationStatus) => Promise<number>;
  updateObligationPriority: (
    id: string,
    priority: Priority,
  ) => Promise<{ success: boolean; message?: string }>;
  updateObligationNotes: (
    id: string,
    notes: string,
    nextAction?: string,
    blocker?: string,
    waitingOn?: string,
  ) => Promise<void>;
  updateObligation: (id: string, updates: Partial<Obligation>) => Promise<void>;
  addObligation: (
    data: Omit<Obligation, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => Promise<string>;
  deleteObligation: (id: string) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  addClient: (data: Omit<Client, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<string>;
  deleteClient: (id: string) => Promise<void>;
  resetToDemoData: () => Promise<void>;
  batchCreateObligations: (candidates: CandidateObligation[]) => Promise<number>;
  importSnapshotData: (snapshot: SnapshotData) => Promise<void>;
  addPersonalTask: (task: Omit<PersonalTask, "id">) => Promise<void>;
  updatePersonalTask: (id: string, updates: Partial<PersonalTask>) => Promise<void>;
  deletePersonalTask: (id: string) => Promise<void>;
  templates: RecurringTemplate[];
  addTemplate: (template: Omit<RecurringTemplate, "id">) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  spawnTemplate: (id: string) => Promise<{ spawned: boolean; message: string }>;
  openThisWeekBooks: (
    picks: { clientId: string; pin: boolean }[],
  ) => Promise<{ weekCode: string; created: number; pinned: number }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function stampClients(): Client[] {
  const now = new Date().toISOString();
  return DEMO_CLIENTS.map((c) => ({ ...c, userId: UID, createdAt: now, updatedAt: now }));
}

function stampObligations(): Obligation[] {
  const now = new Date().toISOString();
  return DEMO_OBLIGATIONS.map((o) => ({ ...o, userId: UID, createdAt: now, updatedAt: now }));
}

function stampCandidates(candidates: CandidateObligation[]): Obligation[] {
  const now = new Date().toISOString();
  return candidates.map((c) => ({
    id: `ob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientId: c.clientId,
    workstream: c.workstream,
    periodStart: c.periodStart,
    dueDate: c.dueDate,
    status: c.status,
    owner: c.owner,
    reviewer: c.reviewer,
    priority: c.priority,
    recurring: c.recurring,
    nextAction: c.nextAction,
    blocker: c.blocker,
    waitingOn: c.waitingOn,
    notes: c.notes,
    order: c.order,
    taskLabel: c.taskLabel,
    weekCode: c.weekCode,
    sourceSheet: c.sourceSheet,
    entityName: c.entityName,
    estimatedMinutes: c.estimatedMinutes,
    onTodayPlan: false,
    userId: UID,
    createdAt: now,
    updatedAt: now,
  }));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [lastClosedDate, setLastClosedDate] = useState<string | null>(null);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [loadedClients, loadedObligations, loadedPersonal, loadedTemplates] = await Promise.all([
      getAllClients(UID),
      getAllObligations(UID),
      getMeta<PersonalTask[]>(PERSONAL_KEY),
      getMeta<RecurringTemplate[]>(TEMPLATES_KEY),
    ]);
    setClients(loadedClients.sort((a, b) => a.name.localeCompare(b.name)));
    setObligations(loadedObligations.sort((a, b) => (a.order || 0) - (b.order || 0)));
    setPersonalTasks(
      (loadedPersonal !== null && loadedPersonal !== undefined ? loadedPersonal : DEMO_PERSONAL_TASKS).sort(
        (a, b) => a.order - b.order,
      ),
    );
    setTemplates(loadedTemplates !== null && loadedTemplates !== undefined ? loadedTemplates : []);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const initData = async () => {
      try {
        await openDatabase();
        const loadedClients = await getAllClients(UID);

        if (loadedClients.length === 0) {
          await seedInitialDemoData(UID, stampClients(), stampObligations());
          await setMeta(SEED_VERSION_KEY, SEED_VERSION);
          await setMeta(PERSONAL_KEY, DEMO_PERSONAL_TASKS);
          await setMeta(METKA_PACK_KEY, 1);
        }

        const [currClients, loadedObs] = await Promise.all([getAllClients(UID), getAllObligations(UID)]);
        const packMigrated = await getMeta<number>(METKA_PACK_KEY);
        if (!packMigrated) {
          const supersede = loadedObs.filter(
            (o) => isGenericMetkaBas(o) && (o.status === "Not started" || o.status === "In progress"),
          );
          if (supersede.length > 0) {
            const now = new Date().toISOString();
            await batchPutObligations(
              supersede.map((o) => ({
                ...o,
                status: "Not applicable" as const,
                notes: [o.notes, "Replaced by Metka entity pack (one BAS cell per entity)."]
                  .filter(Boolean)
                  .join("\n"),
                updatedAt: now,
              })),
            );
          }
          await setMeta(METKA_PACK_KEY, 1);
        }
        const afterMigrate = !packMigrated ? await getAllObligations(UID) : loadedObs;
        const missing = generateRollingHorizon(currClients, afterMigrate, 2);
        if (missing.length > 0) {
          await batchPutObligations(stampCandidates(missing));
        }

        if (isMounted) {
          await refreshData();
          const closed = await getMeta<string>(LAST_CLOSED_KEY);
          setLastClosedDate(closed);
          const exported = await getMeta<string>(LAST_EXPORT_KEY);
          setLastExportAt(exported);
          const storedTemplates = await getMeta<RecurringTemplate[]>(TEMPLATES_KEY);
          if (storedTemplates !== null && storedTemplates !== undefined) {
            setTemplates(storedTemplates);
          } else {
            await setMeta(TEMPLATES_KEY, DEMO_TEMPLATES);
            setTemplates(DEMO_TEMPLATES);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("IndexedDB initialization error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading local data");
          setLoading(false);
        }
      }
    };

    void initData();

    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  const p1Count = useMemo(
    () =>
      obligations.filter(
        (o) => o.priority === "P1" && o.status !== "Done" && o.status !== "Not applicable",
      ).length,
    [obligations],
  );

  const persistPersonal = async (next: PersonalTask[]) => {
    await setMeta(PERSONAL_KEY, next);
    setPersonalTasks(next.sort((a, b) => a.order - b.order));
  };

  const updateObligationStatus = async (id: string, status: ObligationStatus) => {
    const target = obligations.find((o) => o.id === id);
    if (!target) return;

    try {
      const now = new Date().toISOString();
      const updatedOb: Obligation = {
        ...target,
        status,
        completedAt: status === "Done" ? getMelbourneToday() : null,
        updatedAt: now,
      };
      await putObligation(updatedOb);
      await refreshData();
    } catch (err: unknown) {
      console.error("Error updating status in IDB:", err);
      setError(err instanceof Error ? err.message : "Failed to update status");
      throw err;
    }
  };

  const batchUpdateObligationStatus = async (ids: string[], status: ObligationStatus) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return 0;
    const now = new Date().toISOString();
    const today = getMelbourneToday();
    const updates: Obligation[] = [];
    for (const id of unique) {
      const target = obligations.find((o) => o.id === id);
      if (!target) continue;
      updates.push({
        ...target,
        status,
        completedAt: status === "Done" ? today : null,
        updatedAt: now,
      });
    }
    if (updates.length === 0) return 0;
    try {
      await batchPutObligations(updates);
      await refreshData();
      return updates.length;
    } catch (err: unknown) {
      console.error("Error batch updating status in IDB:", err);
      setError(err instanceof Error ? err.message : "Failed to update status");
      throw err;
    }
  };

  const updateObligationPriority = async (
    id: string,
    newPriority: Priority,
  ): Promise<{ success: boolean; message?: string }> => {
    const target = obligations.find((o) => o.id === id);
    if (!target) return { success: false, message: "Obligation not found" };

    if (newPriority === "P1" && target.priority !== "P1") {
      const activeP1s = obligations.filter(
        (o) =>
          o.id !== id &&
          o.priority === "P1" &&
          o.status !== "Done" &&
          o.status !== "Not applicable",
      );
      if (activeP1s.length >= 3) {
        return {
          success: false,
          message: "Max three P1 obligations allowed. Please demote an existing P1 item first.",
        };
      }
    }

    try {
      const now = new Date().toISOString();
      await putObligation({ ...target, priority: newPriority, updatedAt: now });
      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error updating priority in IDB:", err);
      return {
        success: false,
        message: err instanceof Error ? err.message : "Failed to update priority",
      };
    }
  };

  const updateObligationNotes = async (
    id: string,
    notes: string,
    nextAction?: string,
    blocker?: string,
    waitingOn?: string,
  ) => {
    const target = obligations.find((o) => o.id === id);
    if (!target) return;
    const now = new Date().toISOString();
    const updatedOb: Obligation = { ...target, notes, updatedAt: now };
    if (nextAction !== undefined) updatedOb.nextAction = nextAction;
    if (blocker !== undefined) updatedOb.blocker = blocker;
    if (waitingOn !== undefined) updatedOb.waitingOn = waitingOn;
    await putObligation(updatedOb);
    await refreshData();
  };

  const updateObligation = async (id: string, updates: Partial<Obligation>) => {
    const target = obligations.find((o) => o.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    const updatedOb: Obligation = { ...target };

    if (updates.clientId !== undefined) updatedOb.clientId = updates.clientId;
    if (updates.workstream !== undefined) updatedOb.workstream = updates.workstream;
    if (updates.periodStart !== undefined) updatedOb.periodStart = updates.periodStart;
    if (updates.dueDate !== undefined) updatedOb.dueDate = updates.dueDate;
    if (updates.status !== undefined) {
      updatedOb.status = updates.status;
      updatedOb.completedAt = updates.status === "Done" ? updates.completedAt || getMelbourneToday() : null;
    }
    if (updates.owner !== undefined) updatedOb.owner = updates.owner;
    if (updates.reviewer !== undefined) updatedOb.reviewer = updates.reviewer;
    if (updates.priority !== undefined) updatedOb.priority = updates.priority;
    if (updates.nextAction !== undefined) updatedOb.nextAction = updates.nextAction;
    if (updates.blocker !== undefined) updatedOb.blocker = updates.blocker;
    if (updates.waitingOn !== undefined) updatedOb.waitingOn = updates.waitingOn;
    if (updates.recurring !== undefined) updatedOb.recurring = updates.recurring;
    if (updates.estimatedMinutes !== undefined) updatedOb.estimatedMinutes = updates.estimatedMinutes;
    if (updates.order !== undefined) updatedOb.order = updates.order;
    if (updates.carryOver !== undefined) updatedOb.carryOver = updates.carryOver;
    if (updates.notes !== undefined) updatedOb.notes = updates.notes;
    if (updates.taskLabel !== undefined) updatedOb.taskLabel = updates.taskLabel;
    if (updates.onTodayPlan !== undefined) updatedOb.onTodayPlan = updates.onTodayPlan;
    if (updates.todayOrder !== undefined) updatedOb.todayOrder = updates.todayOrder;
    if (updates.weekCode !== undefined) updatedOb.weekCode = updates.weekCode;
    if (updates.entityName !== undefined) updatedOb.entityName = updates.entityName;
    if (updates.sourceSheet !== undefined) updatedOb.sourceSheet = updates.sourceSheet;
    if (updates.templateId !== undefined) updatedOb.templateId = updates.templateId;
    if (updates.completedAt !== undefined && updates.status === undefined) {
      updatedOb.completedAt = updates.completedAt;
    }
    updatedOb.updatedAt = now;

    await putObligation(updatedOb);
    await refreshData();
  };

  const addObligation = async (
    data: Omit<Obligation, "id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<string> => {
    const newId = `ob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    await putObligation({ ...data, id: newId, userId: UID, createdAt: now, updatedAt: now });
    await refreshData();
    return newId;
  };

  const deleteObligation = async (id: string) => {
    await deleteObligationFromIdb(id);
    await refreshData();
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const target = clients.find((c) => c.id === id);
    if (!target) return;
    const now = new Date().toISOString();
    const updatedClient: Client = {
      ...target,
      ...updates,
      id: target.id,
      userId: UID,
      updatedAt: now,
      services: normalizeServices(updates.services ?? target.services),
    };
    await putClient(updatedClient);
    await refreshData();
  };

  const addClient = async (
    data: Omit<Client, "id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<string> => {
    const newId = `client-${Date.now()}`;
    const now = new Date().toISOString();
    await putClient({
      ...data,
      id: newId,
      userId: UID,
      createdAt: now,
      updatedAt: now,
      services: normalizeServices(data.services),
    });
    await refreshData();
    return newId;
  };

  const deleteClient = async (id: string) => {
    await deleteClientFromIdb(id);
    await refreshData();
  };

  const batchCreateObligations = async (candidates: CandidateObligation[]): Promise<number> => {
    if (candidates.length === 0) return 0;
    await batchPutObligations(stampCandidates(candidates));
    await refreshData();
    return candidates.length;
  };

  const resetToDemoData = async () => {
    setLoading(true);
    try {
      await clearUserData(UID);
      await seedInitialDemoData(UID, stampClients(), stampObligations());
      await setMeta(SEED_VERSION_KEY, SEED_VERSION);
      await setMeta(PERSONAL_KEY, DEMO_PERSONAL_TASKS);
      await setMeta(LAST_CLOSED_KEY, null);
      await setMeta(TEMPLATES_KEY, DEMO_TEMPLATES);
      await setMeta(METKA_PACK_KEY, 1);
      await setMeta(LAST_EXPORT_KEY, null);
      setLastClosedDate(null);
      setLastExportAt(null);
      setTemplates(DEMO_TEMPLATES);
      const missing = generateRollingHorizon(stampClients(), stampObligations(), 2);
      if (missing.length > 0) await batchPutObligations(stampCandidates(missing));
      await refreshData();
    } catch (err: unknown) {
      console.error("Error resetting demo data in IDB:", err);
      setError(err instanceof Error ? err.message : "Failed to reset data");
    } finally {
      setLoading(false);
    }
  };

  const importSnapshotData = async (snapshot: SnapshotData) => {
    setLoading(true);
    try {
      await applySnapshot(UID, snapshot);
      await setMeta(SEED_VERSION_KEY, SEED_VERSION);
      const exportStamp =
        typeof snapshot.exportedAt === "string" && snapshot.exportedAt
          ? snapshot.exportedAt
          : new Date().toISOString();
      await setMeta(LAST_EXPORT_KEY, exportStamp);
      setLastExportAt(exportStamp);
      setLastClosedDate(null);
      await refreshData();
    } catch (err: unknown) {
      console.error("Error applying snapshot in IDB:", err);
      setError(err instanceof Error ? err.message : "Failed to import snapshot");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markExported = async () => {
    const stamp = new Date().toISOString();
    await setMeta(LAST_EXPORT_KEY, stamp);
    setLastExportAt(stamp);
  };

  const addPersonalTask = async (task: Omit<PersonalTask, "id">) => {
    const next: PersonalTask[] = [
      ...personalTasks,
      { ...task, id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` },
    ];
    await persistPersonal(next);
  };

  const updatePersonalTask = async (id: string, updates: Partial<PersonalTask>) => {
    const next = personalTasks.map((t) => (t.id === id ? { ...t, ...updates, id: t.id } : t));
    await persistPersonal(next);
  };

  const deletePersonalTask = async (id: string) => {
    await persistPersonal(personalTasks.filter((t) => t.id !== id));
  };

  const pinToToday = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const target = obligations.find((o) => o.id === id);
    if (!target) return { success: false, message: "Obligation not found" };
    const today = getMelbourneToday();
    const openOnPlan = getTodaySet(obligations, today).filter((o) => isOpenStatus(o.status));
    const maxOrder = openOnPlan.reduce((m, o) => Math.max(m, o.todayOrder ?? o.order ?? 0), 0);
    await putObligation({
      ...target,
      onTodayPlan: true,
      todayOrder: maxOrder + 1,
      updatedAt: new Date().toISOString(),
    });
    await refreshData();
    if (openOnPlan.length >= TODAY_SOFT_CAP && !target.onTodayPlan && !target.carryOver) {
      return {
        success: true,
        message: `Pinned. Today's stack is over ${TODAY_SOFT_CAP} open items — sequence or park something.`,
      };
    }
    return { success: true };
  };

  const unpinFromToday = async (id: string) => {
    const target = obligations.find((o) => o.id === id);
    if (!target) return;
    await putObligation({
      ...target,
      onTodayPlan: false,
      carryOver: false,
      updatedAt: new Date().toISOString(),
    });
    await refreshData();
  };

  const reorderTodayPlan = async (orderedIds: string[]) => {
    const now = new Date().toISOString();
    const updates: Obligation[] = [];
    orderedIds.forEach((id, index) => {
      const target = obligations.find((o) => o.id === id);
      if (!target) return;
      updates.push({ ...target, todayOrder: index + 1, updatedAt: now });
    });
    if (updates.length === 0) return;
    await batchPutObligations(updates);
    await refreshData();
  };

  const closeDay = async (decisions: CloseDayDecision[]) => {
    const today = getMelbourneToday();
    const now = new Date().toISOString();
    const plan = getTodaySet(obligations, today);
    const decisionMap = new Map(decisions.map((d) => [d.id, d.action]));
    const updates: Obligation[] = plan.map((o) => {
      if (!isOpenStatus(o.status)) {
        return { ...o, onTodayPlan: false, carryOver: false, updatedAt: now };
      }
      const action = decisionMap.get(o.id) || "park";
      if (action === "carry") {
        return { ...o, onTodayPlan: true, carryOver: true, updatedAt: now };
      }
      return { ...o, onTodayPlan: false, carryOver: false, updatedAt: now };
    });
    if (updates.length > 0) await batchPutObligations(updates);
    await setMeta(LAST_CLOSED_KEY, today);
    setLastClosedDate(today);
    await refreshData();
  };

  const persistTemplates = async (next: RecurringTemplate[]) => {
    setTemplates(next);
    await setMeta(TEMPLATES_KEY, next);
  };

  const addTemplate = async (template: Omit<RecurringTemplate, "id">) => {
    const id = `tpl-${Date.now().toString(36)}`;
    await persistTemplates([...templates, { ...template, id }]);
  };

  const deleteTemplate = async (id: string) => {
    await persistTemplates(templates.filter((t) => t.id !== id));
  };

  const spawnTemplate = async (id: string): Promise<{ spawned: boolean; message: string }> => {
    const template = templates.find((t) => t.id === id);
    if (!template) return { spawned: false, message: "Template not found" };
    const dueDate = nextDueForTemplate(template);
    if (templateAlreadyOpen(template, obligations, dueDate)) {
      return { spawned: false, message: "This cycle already has an open instance" };
    }
    const now = new Date().toISOString();
    const newId = `ob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await putObligation({
      id: newId,
      clientId: template.clientId,
      workstream: template.workstream,
      periodStart: periodStartFromDate(dueDate),
      dueDate,
      status: "Not started",
      owner: "Jan",
      reviewer: "",
      priority: "P2",
      nextAction: template.nextAction,
      blocker: "",
      waitingOn: "",
      recurring: true,
      estimatedMinutes: template.estimatedMinutes,
      order: Date.now() % 1000,
      onTodayPlan: template.pinOnSpawn,
      taskLabel: template.taskLabel,
      templateId: template.id,
      sourceSheet: "Template",
      userId: UID,
      createdAt: now,
      updatedAt: now,
    });
    await refreshData();
    return {
      spawned: true,
      message: template.pinOnSpawn ? "Spawned and pinned to today" : "Spawned into pipeline",
    };
  };

  const openThisWeekBooks = async (
    picks: { clientId: string; pin: boolean }[],
  ): Promise<{ weekCode: string; created: number; pinned: number }> => {
    const today = getMelbourneToday();
    const work = thisWeekBookWork(clients, obligations, today);
    if (!work) return { weekCode: "", created: 0, pinned: 0 };
    const now = new Date().toISOString();
    const writes: Obligation[] = [];
    let created = 0;
    let pinned = 0;
    const openOnPlan = getTodaySet(obligations, today).filter((o) => isOpenStatus(o.status));
    let order = openOnPlan.reduce((m, o) => Math.max(m, o.todayOrder ?? o.order ?? 0), 0);

    for (const pick of picks) {
      const row = work.rows.find((r) => r.client.id === pick.clientId);
      if (!row) continue;
      if (row.existing) {
        if (pick.pin && !row.existing.onTodayPlan && !row.existing.carryOver) {
          order += 1;
          writes.push({
            ...row.existing,
            onTodayPlan: true,
            todayOrder: order,
            updatedAt: now,
          });
          pinned += 1;
        }
        continue;
      }
      if (!row.candidate) continue;
      const stamped = stampCandidates([row.candidate])[0];
      stamped.estimatedMinutes = 60;
      if (pick.pin) {
        order += 1;
        stamped.onTodayPlan = true;
        stamped.todayOrder = order;
        pinned += 1;
      }
      writes.push(stamped);
      created += 1;
    }

    if (writes.length > 0) await batchPutObligations(writes);
    await refreshData();
    return { weekCode: work.week.weekCode, created, pinned };
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        obligations,
        personalTasks,
        loading,
        error,
        p1Count,
        lastClosedDate,
        lastExportAt,
        markExported,
        pinToToday,
        unpinFromToday,
        reorderTodayPlan,
        closeDay,
        updateObligationStatus,
        batchUpdateObligationStatus,
        updateObligationPriority,
        updateObligationNotes,
        updateObligation,
        addObligation,
        deleteObligation,
        updateClient,
        addClient,
        deleteClient,
        resetToDemoData,
        batchCreateObligations,
        importSnapshotData,
        addPersonalTask,
        updatePersonalTask,
        deletePersonalTask,
        templates,
        addTemplate,
        deleteTemplate,
        spawnTemplate,
        openThisWeekBooks,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
