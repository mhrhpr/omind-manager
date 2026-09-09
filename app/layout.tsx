import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OMIND — فایل را بده، تصمیم را بگیر',
  description: 'تحلیل سریع Excel و CSV برای مدیرها و تیم‌ها؛ از داده تا سؤال و اقدام بعدی.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>
}
