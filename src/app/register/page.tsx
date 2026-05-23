import { RegisterClient } from './RegisterClient';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-ink-50 px-6 py-10 md:py-16">
      <RegisterClient />
    </div>
  );
}