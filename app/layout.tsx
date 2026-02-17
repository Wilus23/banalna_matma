import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Matematyczny Quiz Szybkości',
  description: 'Przyjazna dzieciom gra matematyczna na szybkość zbudowana w Next.js'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
