'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Loader2, Shield, AlertTriangle, Info, CheckCircle, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';

export function GlassCard({ children, className, hover = false }: { children: React.ReactNode, className?: string, hover?: boolean }) {
  return (
    <div className={clsx(
      "bg-surface border border-surface-border rounded-2xl shadow-soft-elevated p-6",
      hover && "transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer",
      className
    )}>
      {children}
    </div>
  );
}

export function GradientButton({ 
  children, onClick, href, className, variant = 'primary', loading = false, ...props 
}: { 
  children: React.ReactNode, onClick?: () => void, href?: string, className?: string, variant?: 'primary' | 'shakti' | 'ghost', loading?: boolean 
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all overflow-hidden shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-navy text-white hover:bg-brand-navy-light",
    shakti: "bg-shakti text-brand-navy hover:bg-shaktiHover",
    ghost: "bg-surface-subtle text-text-main hover:bg-surface-border"
  };

  const content = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={clsx(base, variants[variant], className)}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={clsx(base, variants[variant], className)} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
}

export function TrustRing({ score, label, max = 100 }: { score: number, label?: string, max?: number }) {
  const percentage = Math.min(100, Math.max(0, (score / max) * 100));
  const isHigh = percentage >= 80;
  const isMedium = percentage >= 50 && percentage < 80;
  const color = isHigh ? 'var(--color-verified)' : isMedium ? 'var(--color-warning)' : 'var(--color-danger)';
  
  return (
    <div className="flex items-center gap-3 bg-surface-subtle border border-surface-border p-2 rounded-xl">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" className="stroke-surface-border" strokeWidth="3" />
          <motion.circle 
            cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray="100" strokeDashoffset={100 - percentage}
            strokeLinecap="round"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: 100 - percentage }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute text-[10px] font-mono font-bold" style={{ color }}>{Math.round(percentage)}%</span>
      </div>
      {label && (
        <div className="flex flex-col pr-2">
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
          <span className="text-xs font-medium text-text-main">Trust Score</span>
        </div>
      )}
      {isHigh && (
        <div className="flex items-center gap-1 bg-verified-bg text-verified text-xs font-bold px-2 py-1 rounded-md ml-auto">
          <CheckCircle className="w-3 h-3" /> Verified
        </div>
      )}
    </div>
  );
}

export function CitationChip({ id, number, onClick, popoverContent }: { id: string, number: number, onClick?: () => void, popoverContent?: string }) {
  return (
    <span className="relative inline-block group ml-0.5">
      <sup className="cursor-pointer select-none">
        <span 
          onClick={onClick}
          className="inline-flex items-center justify-center bg-chakra/10 border border-chakra/30 text-chakra hover:bg-chakra hover:text-white rounded-md min-w-[24px] min-h-[24px] px-1 text-[11px] font-bold font-mono leading-none transition-colors shadow-sm"
          title="View source"
        >
          [{number}]
        </span>
      </sup>
      {popoverContent && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-brand-navy text-white text-xs p-2 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 font-serif">
          {popoverContent}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-navy"></div>
        </div>
      )}
    </span>
  );
}

export function JurisdictionBadge({ jurisdiction, warn }: { jurisdiction: string, warn?: boolean }) {
  const isIndia = jurisdiction === 'IN' || jurisdiction === 'India';
  const label = isIndia ? 'India' : jurisdiction === 'US' ? 'USA' : jurisdiction === 'AU' ? 'Australia' : jurisdiction;
  const icon = isIndia ? '🇮🇳' : jurisdiction === 'US' ? '🇺🇸' : jurisdiction === 'AU' ? '🇦🇺' : '🌐';
  
  const isWarn = warn || !isIndia;

  return (
    <div className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm",
      isWarn ? "bg-warningBg text-warning border-warning/30" : "bg-surface text-brand-navy border-surface-border"
    )} title={`Jurisdiction: ${label}`}>
      <span>{icon}</span>
      <span>{label}</span>
      {isWarn && <AlertTriangle className="w-3 h-3 ml-1" />}
    </div>
  );
}

export function RiskBanner({ message, action }: { message: string, action?: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-warningBg border-2 border-warning/50 mb-6 shadow-sm"
    >
      <div className="flex items-center gap-3 text-warning">
        <div className="relative flex items-center justify-center">
          <span className="absolute w-3 h-3 bg-warning rounded-full animate-ping opacity-75" />
          <span className="relative w-2.5 h-2.5 bg-warning rounded-full" />
        </div>
        <AlertTriangle className="w-5 h-5 font-bold" />
        <span className="font-bold text-sm text-[#B45309]">{message}</span>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

export function StatCard({ 
  label, value, hint, delay = 0, icon, variant = 'default', href
}: { 
  label: string, value: string | number, hint?: string, delay?: number, 
  icon?: React.ReactNode, variant?: 'default' | 'active' | 'warning' | 'danger', href?: string 
}) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-3 w-full">
        <div className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">{label}</div>
        {icon && (
          <div className={clsx(
            "p-1.5 rounded-lg border",
            variant === 'default' && "bg-surface-subtle border-surface-border text-text-muted",
            variant === 'active' && "bg-verified-bg border-verified/30 text-verified",
            variant === 'warning' && "bg-warningBg border-warning/30 text-warning",
            variant === 'danger' && "bg-dangerBg border-danger/30 text-danger"
          )}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-heading font-bold text-brand-navy self-start tracking-tight">
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-text-muted self-start font-medium">{hint}</div>}
    </>
  );

  const wrapperClass = clsx(
    "bg-surface border border-surface-border rounded-xl flex flex-col items-center justify-center p-5 text-left h-full transition-all duration-300 shadow-sm",
    href && "hover:-translate-y-1 hover:shadow-soft-elevated cursor-pointer hover:border-brand-navy/50 group"
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={href ? "h-full block" : "h-full"}
    >
      {href ? (
        <Link href={href} className={wrapperClass}>
          {content}
        </Link>
      ) : (
        <div className={wrapperClass}>
          {content}
        </div>
      )}
    </motion.div>
  );
}

export function AbstainCard({ title = "Not enough verified sources to answer this safely", reasons, nextStep }: { title?: string, reasons?: string[], nextStep?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-verifiedBg/50 border border-verified/30 text-left w-full py-8 px-6 rounded-2xl shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white border border-verified/30 rounded-full flex items-center justify-center shrink-0 shadow-sm text-verified">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-heading font-bold text-brand-navy mb-2">{title}</h3>
          <p className="text-text-secondary text-sm mb-4 font-medium">
            As a trustworthy legal assistant, I abstain from generating answers when evidence is insufficient. This is a safety feature to prevent hallucinations.
          </p>
          {reasons && reasons.length > 0 && (
            <div className="bg-white rounded-xl p-4 mb-4 border border-surface-border text-sm text-text-secondary shadow-sm">
              <ul className="list-disc list-inside space-y-1.5 font-medium">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {nextStep && (
            <div className="flex items-center gap-2 text-sm text-brand-navy font-bold">
              <ArrowRight className="w-4 h-4 text-chakra" /> {nextStep}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function SourceDrawer({ open, onClose, title, content, children }: { open: boolean, onClose: () => void, title: React.ReactNode, content?: React.ReactNode, children?: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy/20 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-pagebg border-l border-surface-border z-[101] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-white shadow-sm">
              <h2 className="font-heading font-bold text-lg text-brand-navy">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-subtle transition-colors text-text-muted hover:text-brand-navy">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-pagebg">
              {/* Added a subtle yellow highlight style inside the drawer content */}
              <div className="prose prose-sm max-w-none prose-mark:bg-yellow-200 prose-mark:text-brand-navy">
                {content}
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
