export type Toast = { id: number; message: string };

let nextId = 1;
export const toasts = $state<Toast[]>([]);

export function showToast(message: string, ms = 3000) {
  const id = nextId++;
  toasts.push({ id, message });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i !== -1) toasts.splice(i, 1);
  }, ms);
}
