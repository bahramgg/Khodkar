/** Web-side weekly report: run the report and deliver to the owner's Telegram. */
import 'server-only';
import { getDb } from '@khodkar/db';
import { runWeeklyReport, type WeeklyReportResult } from '@khodkar/agent';
import { sendTelegramMessage } from '@khodkar/channels';
import { decryptTelegramCredentials } from './telegram-creds.js';

export async function sendWeeklyReport(
  tenantId: string,
  weekLabel?: string,
): Promise<WeeklyReportResult> {
  const label = weekLabel ?? new Date().toISOString().slice(0, 10);
  return runWeeklyReport(getDb(), tenantId, label, async (target, text) => {
    try {
      const creds = decryptTelegramCredentials(target.credentials);
      return await sendTelegramMessage(creds.token, target.chatId, text);
    } catch {
      return false;
    }
  });
}
