import './globals.css'
import './ui-overrides.css'
import './enterprise-ui.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OMIND — Decision Intelligence for Teams',
  description: 'OMIND داده‌های کاری را به سیگنال، اولویت، تصمیم و اقدام بعدی تبدیل می‌کند.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>
}
