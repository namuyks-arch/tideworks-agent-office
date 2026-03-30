import type { Metadata } from 'next';
import './globals.css';

/* ── Metadata ───────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: 'Tideworks Agent Office',
  description: 'B2B 영업 자동화 에이전트 오피스',
  icons: { icon: '/favicon.ico' },
};

/* ── Root Layout ────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard - main UI font */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* DungGeunMo - pixel art font */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@typopro/web-dunggeunmo@3.7.5/TypoPRO-DungGeunMo.css"
        />
      </head>
      <body className="bg-[#F2F4F6] text-[#191F28] antialiased min-h-screen overflow-hidden font-sans" style={{ fontSize: '16px' }}>
        {children}
      </body>
    </html>
  );
}
