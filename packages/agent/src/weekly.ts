/**
 * Weekly quality report orchestration, shared by the web route and the worker
 * job. Delivery is injected (each host decrypts the tenant's bot creds its own
 * way), so this stays free of env/secret handling.
 */
import {
  reportStats,
  insertQualityReport,
  getOwnerTelegramTarget,
  type Database,
  type OwnerTelegramTarget,
} from '@khodkar/db';
import { buildQualityReport, type QualityReport } from './report.js';

export type ReportDeliver = (target: OwnerTelegramTarget, text: string) => Promise<boolean>;

export interface WeeklyReportResult {
  report: QualityReport;
  delivered: boolean;
  hadTarget: boolean;
}

export async function runWeeklyReport(
  db: Database,
  tenantId: string,
  weekLabel: string,
  deliver: ReportDeliver,
): Promise<WeeklyReportResult> {
  const stats = await reportStats(db, tenantId, 7);
  const report = buildQualityReport(stats, weekLabel);
  await insertQualityReport(db, {
    tenantId,
    week: weekLabel,
    score: report.score,
    issues: report.issues,
    missedSales: report.missedSales,
  });

  const target = await getOwnerTelegramTarget(db, tenantId);
  const delivered = target ? await deliver(target, report.summary) : false;
  return { report, delivered, hadTarget: !!target };
}
