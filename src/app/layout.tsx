import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Notes & Edges — Think in graphs.',
  description:
    'Upload your notes. Watch your ideas become a living knowledge graph. Notes & Edges transforms what you have read, learned, and thought into a map of understanding.',
  keywords: ['knowledge graph', 'notes', 'AI', 'second brain', 'learning'],
  authors: [{ name: 'Notes & Edges' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://notesandedges.com'),
  openGraph: {
    title: 'Notes & Edges — Think in graphs.',
    description: 'Your knowledge, finally connected.',
    type: 'website',
    url: '/',
    images: [{ url: 'https://notes-edges.com/og-image.png', width: 200, height: 196, alt: 'Notes & Edges' }],
  },
  twitter: {
    card: 'summary',
    images: ['https://notes-edges.com/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAF8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} h-full`}
    >
      {/* Inline script: apply stored theme before first paint to prevent flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ne_theme');var r=t==='dark'?'dark':'light';document.documentElement.setAttribute('data-theme',r);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="h-full overflow-hidden antialiased">
        <TooltipProvider delayDuration={400}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
