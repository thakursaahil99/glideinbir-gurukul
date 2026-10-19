import type { RpcHandlers, RpcName } from "@/app/api/rpc/[name]/route";

/**
 * Typed client for /api/rpc. `rpc("courses.buy", courseId)` has the same signature and
 * return type as calling the server function directly. Throws on network/auth errors;
 * functions report their own validation errors in their return value as before.
 */
export async function rpc<N extends RpcName>(name: N, ...args: Parameters<RpcHandlers[N]>): Promise<Awaited<ReturnType<RpcHandlers[N]>>> {
  const res = await fetch(`/api/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (res.status === 401 && typeof window !== "undefined") window.location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body.result as Awaited<ReturnType<RpcHandlers[N]>>;
}
