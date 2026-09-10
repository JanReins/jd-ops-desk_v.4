import type { Client, Obligation } from "./types";

const DB_NAME = "ops-desk";
const DB_VERSION = 1;

let dbInstancePromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("clients")) {
        db.createObjectStore("clients", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("obligations")) {
        const obStore = db.createObjectStore("obligations", { keyPath: "id" });
        obStore.createIndex("clientId", "clientId", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbInstancePromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbInstancePromise = null;
      reject(request.error || new Error("Failed to open IndexedDB"));
    };

    request.onblocked = () => {
      console.warn("IndexedDB open blocked: close other tabs running ops-desk");
    };
  });

  return dbInstancePromise;
}

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");
    const req = store.get(key);
    req.onsuccess = () => {
      resolve(req.result ? (req.result.value as T) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readwrite");
    const store = tx.objectStore("meta");
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function getAllClients(uid: string): Promise<Client[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clients", "readonly");
    const store = tx.objectStore("clients");
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as Client[]) || [];
      const userClients = all.filter((c) => !c.userId || c.userId === uid);
      resolve(userClients);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllObligations(uid: string): Promise<Obligation[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("obligations", "readonly");
    const store = tx.objectStore("obligations");
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as Obligation[]) || [];
      const userObligations = all.filter((o) => !o.userId || o.userId === uid);
      resolve(userObligations);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function putClient(client: Client): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clients", "readwrite");
    const store = tx.objectStore("clients");
    store.put(client);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function putObligation(obligation: Obligation): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("obligations", "readwrite");
    const store = tx.objectStore("obligations");
    store.put(obligation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function deleteObligation(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("obligations", "readwrite");
    const store = tx.objectStore("obligations");
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function deleteClient(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["clients", "obligations"], "readwrite");
    const clientsStore = tx.objectStore("clients");
    const obligationsStore = tx.objectStore("obligations");

    clientsStore.delete(id);

    const index = obligationsStore.index("clientId");
    const req = index.getAllKeys(id);
    req.onsuccess = () => {
      const keys = req.result;
      for (const obKey of keys) {
        obligationsStore.delete(obKey);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function batchPutObligations(obligations: Obligation[]): Promise<void> {
  if (obligations.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("obligations", "readwrite");
    const store = tx.objectStore("obligations");
    for (const ob of obligations) {
      store.put(ob);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export function getUserMetaKeys(uid: string): string[] {
  return [
    `seededAt:${uid}`,
    `personalTasks:${uid}`,
    `seedVersion:${uid}`,
    `lastClosedDate:${uid}`,
    `templates:${uid}`,
    `metkaPackV1:${uid}`,
    `lastExport:${uid}`,
  ];
}

export async function clearUserData(uid: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["meta", "clients", "obligations"], "readwrite");
    const metaStore = tx.objectStore("meta");
    const clientsStore = tx.objectStore("clients");
    const obligationsStore = tx.objectStore("obligations");

    for (const key of getUserMetaKeys(uid)) {
      metaStore.delete(key);
    }

    const clientsReq = clientsStore.openCursor();
    clientsReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const client = cursor.value as Client;
        if (!client.userId || client.userId === uid) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    const obligationsReq = obligationsStore.openCursor();
    obligationsReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const ob = cursor.value as Obligation;
        if (!ob.userId || ob.userId === uid) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function seedInitialDemoData(
  uid: string,
  demoClients: Client[],
  demoObligations: Obligation[],
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["meta", "clients", "obligations"], "readwrite");
    const metaStore = tx.objectStore("meta");
    const clientsStore = tx.objectStore("clients");
    const obligationsStore = tx.objectStore("obligations");

    const now = new Date().toISOString();

    for (const client of demoClients) {
      clientsStore.put({
        ...client,
        userId: uid,
        createdAt: client.createdAt || now,
        updatedAt: client.updatedAt || now,
      });
    }

    for (const ob of demoObligations) {
      obligationsStore.put({
        ...ob,
        userId: uid,
        createdAt: ob.createdAt || now,
        updatedAt: ob.updatedAt || now,
      });
    }

    metaStore.put({ key: `seededAt:${uid}`, value: now });
    metaStore.put({ key: "schemaVersion", value: 2 });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function replaceUserData(
  uid: string,
  newClients: Client[],
  newObligations: Obligation[],
): Promise<void> {
  const db = await openDatabase();

  const existingClients = await getAllClients(uid);
  const existingObligations = await getAllObligations(uid);

  const clientIdsToDelete = existingClients.map((c) => c.id);
  const obligationIdsToDelete = existingObligations.map((o) => o.id);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["meta", "clients", "obligations"], "readwrite");
    const metaStore = tx.objectStore("meta");
    const clientsStore = tx.objectStore("clients");
    const obligationsStore = tx.objectStore("obligations");

    const now = new Date().toISOString();

    for (const id of clientIdsToDelete) {
      clientsStore.delete(id);
    }
    for (const id of obligationIdsToDelete) {
      obligationsStore.delete(id);
    }

    for (const client of newClients) {
      clientsStore.put({
        ...client,
        userId: uid,
        createdAt: client.createdAt || now,
        updatedAt: now,
      });
    }

    for (const ob of newObligations) {
      obligationsStore.put({
        ...ob,
        userId: uid,
        createdAt: ob.createdAt || now,
        updatedAt: now,
      });
    }

    const seededAtReq = metaStore.get(`seededAt:${uid}`);
    seededAtReq.onsuccess = () => {
      if (!seededAtReq.result) {
        metaStore.put({ key: `seededAt:${uid}`, value: now });
      }
    };
    metaStore.put({ key: "schemaVersion", value: 2 });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });

  if (newClients.length > 0) {
    const postClients = await getAllClients(uid);
    if (postClients.length === 0) {
      throw new Error("Import wrote 0 clients — replaceUserData deleted the new rows.");
    }
  }
}
