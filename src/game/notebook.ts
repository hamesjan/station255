// The player's journal. A set of recorded entries, persisted to localStorage so
// the catalog survives reloads. Entries are keyed by a stable id so the same
// thing is never recorded twice.
export interface NotebookEntry {
  id: string;
  title: string;
  body: string;
  at: number; // epoch ms when first recorded
}

const KEY = 'station255.notebook.v1';

export class Notebook {
  private readonly entries = new Map<string, NotebookEntry>();

  constructor() {
    this.load();
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  // Record something. Returns true only if it's new (first time seen).
  add(entry: Omit<NotebookEntry, 'at'>): boolean {
    if (this.entries.has(entry.id)) return false;
    this.entries.set(entry.id, { ...entry, at: Date.now() });
    this.save();
    return true;
  }

  all(): NotebookEntry[] {
    return [...this.entries.values()].sort((a, b) => a.at - b.at);
  }

  get count(): number {
    return this.entries.size;
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.entries.values()]));
    } catch {
      /* storage unavailable (private mode / quota) — keep in memory only */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as NotebookEntry[];
      for (const e of list) if (e && e.id) this.entries.set(e.id, e);
    } catch {
      /* ignore corrupt storage */
    }
  }
}
