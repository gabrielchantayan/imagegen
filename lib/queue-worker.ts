import { process_queue } from "./generation-processor";
import { reset_stale_processing_items, cleanup_stale_locks } from "./queue-locks";

let worker_interval: NodeJS.Timeout | null = null;
let is_processing = false;
let initialized = false;

export const start_queue_worker = () => {
  if (worker_interval) return;

  console.log("[Queue Worker] Starting queue worker...");

  // On startup, reset any stale processing items from previous crashes
  if (!initialized) {
    const reset_count = reset_stale_processing_items();
    if (reset_count > 0) {
      console.log(`[Queue Worker] Reset ${reset_count} stale processing item(s) to queued`);
    }

    // Clean up any orphaned locks
    const cleaned = cleanup_stale_locks();
    if (cleaned > 0) {
      console.log(`[Queue Worker] Cleaned up ${cleaned} stale lock(s)`);
    }

    initialized = true;
  }

  // Check queue immediately on startup
  run_processing_cycle();

  // Then check periodically (every 10 seconds)
  // This is a safety net in case the event-driven trigger fails or server restarts
  worker_interval = setInterval(run_processing_cycle, 10000);
};

const run_processing_cycle = async () => {
  if (is_processing) return;

  is_processing = true;
  try {
    await process_queue();
  } catch (error) {
    console.error("[Queue Worker] Error processing queue:", error);
  } finally {
    is_processing = false;
  }
};
