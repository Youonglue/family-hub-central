import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live sync — subscribes to Lovable Cloud realtime and invalidates the
 * matching React Query caches whenever ANY device in the family adds,
 * updates or deletes a row. Mount once inside the authenticated shell so
 * a calendar event added on Mum's phone appears on the kitchen tablet a
 * beat later without a manual refresh.
 */
const CHANNEL_NAME = "familyhub-live";

const TABLE_QUERIES: Record<string, string[][]> = {
  events:            [["events"], ["events-upcoming"]],
  shopping_items:    [["shopping"]],
  chore_completions: [["completions-recent"], ["points"], ["leaderboard"]],
  meal_plan:         [["meal-plan"]],
  chores:            [["chores"]],
  rewards:           [["rewards"]],
  family_members:    [["members"], ["points"], ["leaderboard"]],
};

export function useLiveSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    for (const table of Object.keys(TABLE_QUERIES)) {
      channel.on(
        // realtime typings are loose for postgres_changes; the runtime accepts this shape
        "postgres_changes" as never,
        { event: "*", schema: "public", table },
        () => {
          for (const key of TABLE_QUERIES[table]) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      );
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
