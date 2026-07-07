/**
 * BullMQ worker process. Queues (crawl, campaigns, weekly-report) are wired up
 * in later weeks (§15). Week 1: boot, connect to Redis, stay alive so
 * `docker compose up` has a healthy worker container.
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// Declared now so producers in the web app can enqueue; consumers added later.
export const queues = {
  crawl: new Queue('crawl', { connection }),
  campaigns: new Queue('campaigns', { connection }),
  weeklyReport: new Queue('weekly-report', { connection }),
};

async function main() {
  console.log('[worker] up; connected to', REDIS_URL);
  console.log('[worker] queues:', Object.keys(queues).join(', '));
  // No processors yet — keep the process alive.
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
