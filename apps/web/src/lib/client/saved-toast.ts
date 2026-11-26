import { mount, unmount } from "svelte";
import SavedToast from "#lib/components/SavedToast.svelte";

let current: Record<string, unknown> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** A save receipt shown after the editor dialog has closed; only called after the server confirmed the save. */
export function showSavedToast(message: string) {
  if (typeof document === "undefined") return;
  clearTimeout(timer);
  if (current) void unmount(current);
  current = mount(SavedToast, { target: document.body, props: { message } });
  timer = setTimeout(() => {
    if (current) void unmount(current);
    current = null;
  }, 3500);
}
