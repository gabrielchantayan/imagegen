export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { start_queue_worker } = await import("./lib/queue-worker");
    start_queue_worker();
  }
}
