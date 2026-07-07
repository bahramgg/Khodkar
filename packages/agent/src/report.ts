/**
 * Weekly quality report (§11). A heuristic "judge" over the week's aggregate
 * stats — deflection rate, unanswered questions, missed sales — producing a
 * score, a Persian summary for the owner's Telegram, and structured issues.
 * (A real LLM-as-judge implements the same shape and drops in later.)
 */
import { toPersianDigits } from '@khodkar/shared';

export interface ReportStats {
  conversations: number;
  autoSent: number;
  drafts: number;
  unanswered: number;
  leads: number;
}

export interface QualityIssue {
  type: 'low_deflection' | 'unanswered';
  detail: string;
}

export interface QualityReport {
  score: number;
  summary: string;
  issues: QualityIssue[];
  missedSales: { reason: string; count: number }[];
  deflectionPct: number;
}

function pct(n: number): number {
  return Math.round(n * 100);
}

export function buildQualityReport(stats: ReportStats, weekLabel: string): QualityReport {
  const handled = stats.autoSent + stats.drafts;
  const deflection = handled > 0 ? stats.autoSent / handled : 1;
  const deflectionPct = pct(deflection);

  const score = Math.max(
    0,
    Math.min(100, Math.round(deflection * 70 + Math.max(0, 30 - stats.unanswered * 3))),
  );

  const issues: QualityIssue[] = [];
  if (handled > 0 && deflection < 0.7) {
    issues.push({ type: 'low_deflection', detail: `نرخ پاسخ خودکار ${toPersianDigits(deflectionPct)}٪` });
  }
  if (stats.unanswered > 0) {
    issues.push({ type: 'unanswered', detail: `${toPersianDigits(stats.unanswered)} سؤال بی‌جواب` });
  }

  const missedSales =
    stats.unanswered > 0 ? [{ reason: 'unanswered', count: stats.unanswered }] : [];

  const lines = [
    `📊 گزارش هفتگی «${weekLabel}»`,
    `• گفتگوها: ${toPersianDigits(stats.conversations)}`,
    `• پاسخ خودکار: ${toPersianDigits(stats.autoSent)} (${toPersianDigits(deflectionPct)}٪)`,
    `• در انتظار تأیید: ${toPersianDigits(stats.drafts)}`,
    `• لید جدید: ${toPersianDigits(stats.leads)}`,
    `• سؤال بی‌جواب: ${toPersianDigits(stats.unanswered)}`,
    `امتیاز کیفیت: ${toPersianDigits(score)}/۱۰۰`,
  ];
  if (issues.length) lines.push(`نکته: ${issues.map((i) => i.detail).join('؛ ')}`);

  return { score, summary: lines.join('\n'), issues, missedSales, deflectionPct };
}
