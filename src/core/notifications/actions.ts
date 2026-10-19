"use server";

import { z } from "zod";
import { requireUser } from "@/core/auth/current";
import { markRead } from "./store";

const idsSchema = z.union([z.literal("all"), z.array(z.string().uuid()).max(200)]);

export async function markReadAction(ids: unknown) {
  const user = await requireUser("/notifications");
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return;
  await markRead(user.id, parsed.data);
}
