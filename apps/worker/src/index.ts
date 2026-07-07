/**
 * BullMQ worker process. Runs the weekly quality-report job on a schedule
 * (§11); crawl/campaign queues land in later weeks.
 */
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processWeeklyReport } from './weekly-report.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const queues = {
  crawl: new Queue('crawl', { connection }),
  campaigns: new Queue('campaigns', { connection }),
  weeklyReport: new Queue('weekly-report', { connection }),
};

const weeklyReportWorker = new Worker(
  'weekly-report',
  async (job) => {
    const weekLabel = (job.data?.weekLabel as string) ?? new Date().toISOString().slice(0, 10);
    console.log('[weekly-report] running for', weekLabel);
    return processWeeklyReport(weekLabel);
  },
  { connection },
);

async function main() {
  // Schedule the report every Saturday 09:00 (Iran business week start).
  await queues.weeklyReport.add(
    'weekly',
    {},
    { repeat: { pattern: '0 9 * * 6' }, jobId: 'weekly-report-cron' },
  );
  console.log('[worker] up; weekly-report scheduled; connected to', REDIS_URL);
  weeklyReportWorker.on('failed', (job, err) =>
    console.error('[weekly-report] job failed', job?.id, err),
  );
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
