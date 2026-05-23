import { formatJobDate, formatJobRate } from '@/lib/marketplace';

export function defaultOfferMessage(job: { name: string; location: string; workDate: Date; startTime: string | null; endTime: string | null; defaultRateCents: number; minRateCents: number | null; maxRateCents: number | null; payType: string }) {
  const time = job.startTime || job.endTime ? `\nTime: ${job.startTime || '-'} - ${job.endTime || '-'}` : '';
  return `Hi {name}, Partime job offer:\n\n${job.name}\nDate: ${formatJobDate(job.workDate)}${time}\nLocation: ${job.location}\nPay: ${formatJobRate(job)}\n\nReply 1 if interested. Reply 2 if not interested.`;
}