import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* -------------------- FAMILY MEMBERS -------------------- */
export const listMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    // TODO: Replace with SQLite query
    return [];
  });

export const addMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(60),
        avatar_color: z.string().min(1).max(20),
        is_kid: z.boolean(),
        is_parent: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // TODO: Replace with SQLite insertion
    return { success: true };
  });

/* -------------------- SHOPPING LIST / MEALS / CHORES -------------------- */
// Add similar placeholders for any other functions you have in this file
// Ensure they all remove the .middleware() and the context.supabase calls
