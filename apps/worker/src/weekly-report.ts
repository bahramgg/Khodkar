/**
 * Weekly quality-report job: for every active tenant, build the report, store
 * it, and push the summary to the owner's Telegram.
 */
import { createDb, listActiveTenantIds } from '@khodkar/db';
import { runWeeklyReport, type ReportDeliver } from '@khodkar/agent';
import { sendTelegramMessage, type TelegramCredentials } from '@khodkar/channels';
import { decrypt, keyFromHex } from '@khodkar/shared';

function makeDeliver(): ReportDeliver {
  const key = keyFromHex(process.env.CREDENTIALS_KEY ?? '');
  return async (target, text) => {
    try {
      const creds = JSON.parse(decrypt(target.credentials, key)) as TelegramCredentials;
      return await sendTelegramMessage(creds.token, target.chatId, text);
    } catch {
      return false;
    }
  };
}

export async function processWeeklyReport(weekLabel: string): Promise<{ tenants: number }> {
  const { db, sql: raw } = createDb();
  const deliver = makeDeliver();
  const tenantIds = await listActiveTenantIds(db);

  for (const id of tenantIds) {
    try {
      await runWeeklyReport(db, id, weekLabel, deliver);
    } catch (err) {
      console.error('[weekly-report] tenant', id, 'failed:', err);
    }
  }
  await raw.end();
  return { tenants: tenantIds.length };
}
