import { getBaileysGatewayDiagnostics, sendBaileysMessage } from '../src/lib/baileys/client';

async function main() {
  const to = String(process.argv[2] || '').trim();
  const text = String(process.argv[3] || '').trim() || `Partime WhatsApp test ${new Date().toISOString()}`;

  if (!to) {
    console.error('Usage: npm run whatsapp:test -- +60123456789 "Optional message"');
    process.exit(1);
  }

  const diagnostics = getBaileysGatewayDiagnostics();
  console.log(JSON.stringify({ diagnostics }, null, 2));

  const result = await sendBaileysMessage({
    toPhoneE164: to,
    text,
    purpose: 'manual-test',
    metadata: { source: 'partime-whatsapp-test-script' },
  });

  console.log(JSON.stringify({ result }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

void main();