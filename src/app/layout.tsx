import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partime',
  description: 'Part-time staff attendance and weekly payroll.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
