import { createHmac } from "node:crypto";

/**
 * LiveKit access tokens without the SDK: a LiveKit token is an HS256 JWT signed
 * with the API secret, carrying a `video` grant for one room.
 * Docs: https://docs.livekit.io/home/get-started/authentication/
 */
export const livekitConfigured = () => !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function livekitToken(
  opts: { room: string; identity: string; name: string; ttlSec?: number },
  creds = { key: process.env.LIVEKIT_API_KEY ?? "", secret: process.env.LIVEKIT_API_SECRET ?? "" },
  now = Math.floor(Date.now() / 1000),
) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: creds.key,
    sub: opts.identity,
    name: opts.name,
    nbf: now - 10,
    exp: now + (opts.ttlSec ?? 2 * 60 * 60),
    video: { room: opts.room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
  };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = b64url(createHmac("sha256", creds.secret).update(body).digest());
  return `${body}.${sig}`;
}

/** Link to LiveKit's hosted meeting app, pre-joined to the room with our token. */
export function livekitMeetUrl(token: string, url = process.env.LIVEKIT_URL ?? "") {
  return `https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(url)}&token=${encodeURIComponent(token)}`;
}
