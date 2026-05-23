import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/time';
import { formatMYR } from '@/lib/money';
import { PrintButtons } from './PrintButtons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventQrPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const event = await prisma.workEvent.findUnique({ where: { id: params.id } });
  if (!event) notFound();

  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  const scanUrl = `${base}/scan/${event.scanToken}`;
  const png = await QRCode.toDataURL(scanUrl, { errorCorrectionLevel: 'M', margin: 1, width: 480 });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 no-print">
        <a href="/admin/events" className="text-sm text-ink-500 hover:underline">← Back to events</a>
        <PrintButtons scanUrl={scanUrl} png={png} eventName={event.name} />
      </div>

      <div className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">{event.name}</div>
            <div className="text-sm text-ink-500">{event.location}</div>
            <div className="text-sm text-ink-500">{formatDate(event.workDate)} · {formatMYR(event.defaultRateCents)}/hr</div>
          </div>
          <div className="text-xs text-ink-500">Token: <code>{event.scanToken}</code></div>
        </div>

        <div className="flex flex-col items-center py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={png} width={320} height={320} alt={`QR for ${event.name}`} />
          <div className="text-xs text-ink-500 mt-3 break-all max-w-md text-center">{scanUrl}</div>
          <div className="text-sm text-ink-700 mt-4">Ask staff to scan this QR code to check in or out.</div>
        </div>
      </div>
    </div>
  );
}
