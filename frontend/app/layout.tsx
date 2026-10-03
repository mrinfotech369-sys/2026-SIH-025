import type { Metadata } from 'next';
import { Inter, Sora, Merriweather, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';

const fontInter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fontSora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });
const fontMerriweather = Merriweather({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-merriweather', display: 'swap' });
const fontJetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
const fontNotoSansDevanagari = Noto_Sans_Devanagari({ weight: ['400', '500', '600', '700'], subsets: ['devanagari'], variable: '--font-noto-sans-devanagari', display: 'swap' });

export const metadata: Metadata = {
  title: 'IP-SAKTI Sahayak',
  description: 'Evidence-grounded IP and regulatory intelligence copilot for Ayurveda.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontInter.variable} ${fontSora.variable} ${fontMerriweather.variable} ${fontJetBrainsMono.variable} ${fontNotoSansDevanagari.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
