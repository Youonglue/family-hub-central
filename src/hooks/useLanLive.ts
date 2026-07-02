import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Live sync over the self-hosted server's WebSocket.
 * -----------------------------------------------------------------------
 * The Fastify server broadcasts a `{ topic }` message on every mutating
 * endpoint. This hook subscribes to that stream and invalidates the matching
 * React Query caches so a chore ticked on Dad's phone, a shopping item added
 * on the fridge tablet, or a calendar entry created on Mum's laptop shows up
 * on every other device within a heartbeat — all over Wi-Fi, no internet.
 *
 * Auto-reconnects with backoff, so unplugging the router doesn't kill it.
 */
const TOPIC_QUERIES: Record<string, string[][]> = {
  members:      [["members"], ["points"]],
  points:       [["points"]],
  chores:       [["chores"]],
  completions:  [["completions-recent"], ["points"]],
  rewards:      [["rewards"]],
  shopping:     [["shopping"]],
  recipes:      [["recipes"]],
  "meal-plan":  [["meal-plan"]],
  events:       [["events"], ["events-upcoming"]],
};

export function useLanLive() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 500; // ms; doubles on failure up to 8s

    const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.addEventListener("open", () => {
        retry = 500;
      });

      ws.addEventListener("message", (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { topic?: string };
          const keys = msg.topic ? TOPIC_QUERIES[msg.topic] : undefined;
          if (!keys) return;
          for (const key of keys) qc.invalidateQueries({ queryKey: key });
        } catch {
          /* ignore malformed frame */
        }
      });

      ws.addEventListener("close", scheduleReconnect);
      ws.addEventListener("error", () => ws?.close());
    };

    function scheduleReconnect() {
      if (closed) return;
      const delay = retry;
      retry = Math.min(retry * 2, 8000);
      setTimeout(connect, delay);
    }

    connect();
    return () => {
      closed = true;
      ws?.close();
    };
  }, [qc]);
}
