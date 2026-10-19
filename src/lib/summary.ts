/**
 * Ask the app shell to re-read the header numbers (wallet balance, unread count).
 * Call after anything that changes them. The shell also re-reads on every navigation.
 * We don't lean on router.refresh() for this: a same-URL refresh right after a server
 * action was intermittently not committed in this app.
 */
export const SUMMARY_EVENT = "gg:summary";

export function refreshSummary() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SUMMARY_EVENT));
}
