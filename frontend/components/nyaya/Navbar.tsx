'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Menu, X, MonitorPlay, Settings, ShieldAlert, ArrowRight, Pause, Play, Eye } from 'lucide-react';
import { useApp } from '@/lib/providers';
import { ProfileMenu } from '@/components/ui';

export function Navbar({ items, onMenuClick, isMenuOpen }: { 
  items: { href: string; label: string; icon?: any }[], 
  onMenuClick?: () => void,
  isMenuOpen?: boolean
}) {
  const path = usePathname();
  const { lang, setLang, user } = useApp();
  const [tickerPaused, setTickerPaused] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('dark'); // Assuming 'dark' acts as high contrast in this setup
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [highContrast]);

  const isActive = (href: string) => path === href || (href !== '/app' && path.startsWith(href));

  return (
    <div className="w-full relative z-50">
      {/* 1. GIGW Top Utility Bar */}
      <div className="bg-brand-navy-light text-white text-xs font-medium px-4 py-1.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <a href="#main-content" className="hover:underline focus:ring-2 focus:ring-white rounded">Skip to main content</a>
          <a href="#screen-reader" className="hover:underline focus:ring-2 focus:ring-white rounded flex items-center gap-1">
            <Eye className="w-3 h-3" /> Screen Reader Access
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-brand-navy rounded px-1 border border-white/10">
            <button className="px-2 py-0.5 hover:bg-white/10 rounded" title="Decrease Text Size">A-</button>
            <button className="px-2 py-0.5 hover:bg-white/10 rounded font-bold" title="Normal Text Size">A</button>
            <button className="px-2 py-0.5 hover:bg-white/10 rounded" title="Increase Text Size">A+</button>
          </div>
          <button 
            onClick={() => setHighContrast(!highContrast)} 
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 border border-white/20"
            title="Toggle High Contrast"
          >
            <MonitorPlay className="w-3 h-3" /> {highContrast ? 'Standard' : 'High Contrast'}
          </button>
          <div className="flex items-center bg-brand-navy rounded overflow-hidden border border-white/20">
            <button onClick={() => setLang('en')} className={clsx("px-3 py-1 font-bold", lang === 'en' ? "bg-white text-brand-navy" : "hover:bg-white/10")}>EN</button>
            <button onClick={() => setLang('hi')} className={clsx("px-3 py-1 font-devanagari font-bold", lang === 'hi' ? "bg-white text-brand-navy" : "hover:bg-white/10")}>हिं</button>
          </div>
        </div>
      </div>

      {/* 2. Main Sticky Header */}
      <nav className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-surface-border shadow-soft-elevated w-full z-40 px-4 py-3 md:px-8 flex items-center justify-between transition-colors">
        
        {/* Logo and Tagline */}
        <div className="flex items-center gap-4">
          <Link href={user ? "/app" : "/"} className="flex items-center gap-3 group">
            {/* Ashoka-chakra-inspired geometric mark */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-chakra">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 m-1 rounded-full border border-chakra border-dashed"
              />
              <div className="w-2 h-2 bg-chakra rounded-full"></div>
            </div>
            <div>
              <span className="font-heading font-bold text-xl text-brand-navy tracking-tight block leading-none">
                IP-SAKTI
              </span>
              <span className="text-[10px] uppercase font-semibold text-text-secondary tracking-widest mt-1 block">
                Intellectual Property Intelligence • India
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-6">
          {items.slice(0, 5).map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={clsx(
                "text-sm font-medium transition-colors hover:text-chakra relative py-1",
                isActive(item.href) ? "text-chakra font-bold" : "text-text-secondary"
              )}
            >
              {item.label}
              {isActive(item.href) && (
                <motion.div 
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-chakra rounded-t-full"
                />
              )}
            </Link>
          ))}
        </div>

        {/* User Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <ProfileMenu
              name={user.name}
              subtitle={`${user.email}`}
              items={[
                { label: 'Settings', href: '/app/settings' },
                { label: 'Sign out', onClick: () => window.location.href = '/login', danger: true },
              ]}
            />
          ) : (
            <Link href="/app/assistant" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy bg-shakti hover:bg-shaktiHover px-4 py-2 rounded-lg transition-colors shadow-sm">
              Ask IP-SAKTI <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {onMenuClick && (
            <button className="lg:hidden p-2 text-brand-navy bg-surface-subtle rounded-lg" onClick={onMenuClick}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </nav>

      {/* 3. Announcement Ticker */}
      <div className="bg-surface-subtle border-b border-surface-border py-2 px-4 overflow-hidden relative flex items-center">
        <button 
          onClick={() => setTickerPaused(!tickerPaused)}
          className="absolute left-4 z-10 p-1.5 bg-surface border border-surface-border rounded shadow-sm text-text-muted hover:text-brand-navy transition-colors hover:bg-surface-subtle"
          aria-label={tickerPaused ? "Play Ticker" : "Pause Ticker"}
        >
          {tickerPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <div className="flex-1 overflow-hidden ml-12">
          <motion.div 
            animate={tickerPaused ? { x: 0 } : { x: ["100%", "-100%"] }}
            transition={tickerPaused ? {} : { repeat: Infinity, duration: 25, ease: "linear" }}
            className="whitespace-nowrap text-sm font-semibold text-text-secondary flex items-center gap-12"
          >
            <span><ShieldAlert className="inline w-4 h-4 mr-1.5 text-verified" /> Every answer is cited and verified against source documents</span>
            <span><ShieldAlert className="inline w-4 h-4 mr-1.5 text-warning" /> Unsure? We abstain to prevent hallucinations</span>
            <span><ShieldAlert className="inline w-4 h-4 mr-1.5 text-danger" /> High-risk queries are automatically flagged for human legal review</span>
          </motion.div>
        </div>
      </div>
      
      {/* Tricolour Signature Strip */}
      <div className="w-full h-1 flex">
        <div className="h-full flex-1 bg-shakti"></div>
        <div className="h-full flex-1 bg-white relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-navy z-10"></div>
        </div>
        <div className="h-full flex-1 bg-verified"></div>
      </div>
    </div>
  );
}
