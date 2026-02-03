import { process_queue } from "./generation-processor";

let worker_interval: NodeJS.Timeout | null = null;
let is_processing = false;

export const start_queue_worker = () => {
  if (worker_interval) return;

  console.log("[Queue Worker] Starting queue worker...");

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
