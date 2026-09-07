import type { Metadata } from 'next';
import { AppProvider } from '@/lib/store';
import './globals.css';
import './product.css';
export const metadata: Metadata = {
  title: 'KAAMSABHA | The rules belong to workers',
  description:
    'A working governance runtime for worker-owned service cooperatives. SIH26089 prototype with synthetic illustrative Pune data.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
