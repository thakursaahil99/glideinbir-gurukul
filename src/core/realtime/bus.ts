/**
 * In-process pub/sub for realtime features (served to browsers over SSE).
 * Lives on globalThis so every route bundle in the process shares one bus.
 * Single server process only; swap for Supabase Realtime / Redis when scaling out.
 */
export interface BusEvent {
  type: string;
  data: unknown;
}
type Listener = (e: BusEvent) => void;

const g = globalThis as typeof globalThis & { __ggBus?: Map<string, Set<Listener>> };
g.__ggBus ??= new Map();
const channels = g.__ggBus;

export function subscribe(channel: string, listener: Listener): () => void {
  let set = channels.get(channel);
  if (!set) channels.set(channel, (set = new Set()));
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (!set!.size) channels.delete(channel);
  };
}

export function publish(channel: string, type: string, data: unknown = null) {
  for (const l of channels.get(channel) ?? []) {
    try {
      l({ type, data });
    } catch {
      // A broken listener must never break the publisher.
    }
  }
}

export const listenerCount = (channel: string) => channels.get(channel)?.size ?? 0;

/**
 * Server-Sent Events response that relays the given channels until the client
 * disconnects. `Cache-Control: no-transform` stops response compression from
 * buffering the stream.
 */
export function sseResponse(req: Request, chans: string[], hello: unknown = null, onTick?: () => void) {
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const write = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          open = false;
        }
      };
      const send = (e: BusEvent) => write(`event: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`);
      const unsubs = chans.map((c) => subscribe(c, send));
      const ping = setInterval(() => {
        write(`: ping\n\n`);
        onTick?.();
      }, 15_000);
      cleanup = () => {
        if (!open) return;
        open = false;
        clearInterval(ping);
        unsubs.forEach((u) => u());
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
      write(`retry: 3000\n\n`);
      send({ type: "hello", data: hello });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
