import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Layout/Header';
import { Footer } from '@/components/Layout/Footer';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: {
    default: `${SITE_NAME} | コミュニティ非公式攻略情報`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/`,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | コミュニティ非公式攻略情報`,
    description: SITE_DESCRIPTION,
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} | コミュニティ非公式攻略情報`,
    description: SITE_DESCRIPTION,
  },
  keywords: ['VRChat', 'Fish!', '攻略', '確率計算', '釣り', '期待値', 'Fish guide'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
