'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, ShieldAlert, FileText, CheckCircle, Clock, Zap, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import data from '@/lib/evaluationData.json';

// Animated CountUp component
function CountUp({ end, suffix = '', decimals = 0 }: { end: number, suffix?: string, decimals?: number }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);

  return <span>{count.toFixed(decimals)}{suffix}</span>;
}

// Radial Gauge Component
function RadialGauge({ value, label, color = "var(--color-chakra)", secondaryColor = "var(--color-border)" }: { value: number, label: string, color?: string, secondaryColor?: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-white border border-surface-border rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-transform">
      <div className="relative w-24 h-24 flex items-center justify-center mb-3">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke={secondaryColor} strokeWidth="12" />
          <motion.circle 
            cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute text-xl font-bold font-mono text-brand-navy">
          <CountUp end={value} suffix="%" decimals={value % 1 === 0 ? 0 : 1} />
        </span>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-text-secondary text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export default function TrustDashboard() {
  const { summary, retrieval, trust, safety, failures, trust_status, timings } = data;

  const timingData = [
    { name: 'Retrieval', ms: timings.retrieval_time_ms, fill: 'var(--color-chakra)' },
    { name: 'Generation', ms: timings.generation_time_ms, fill: 'var(--color-shakti)' },
    { name: 'Verification', ms: timings.verification_time_ms, fill: 'var(--color-verified)' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <h1 className="text-3xl font-heading font-bold text-brand-navy mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-verified" /> Trust Evaluation Dashboard
          </h1>
          <p className="text-text-secondary font-medium">Real-time metrics from the latest automated evaluation run over the ground-truth dataset.</p>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Overall Trust Status</div>
          <div className={`px-6 py-2 rounded-xl border-2 font-bold text-lg flex items-center gap-2 ${
            trust_status === 'PASS' ? 'bg-verifiedBg text-verified border-verified/30' : 'bg-dangerBg text-danger border-danger/30'
          }`}>
            {trust_status === 'PASS' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {trust_status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column - Gauges */}
        <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-6">
          <RadialGauge value={summary.pass_rate} label="Overall Pass Rate" color="var(--color-primary)" />
          <RadialGauge value={trust.citation_coverage} label="Citation Coverage" color="var(--color-chakra)" />
          <RadialGauge value={trust.citation_support_rate} label="Citation Support" color="var(--color-verified)" />
          
          <RadialGauge value={safety.abstention_accuracy} label="Abstention Accuracy" color="var(--color-warning)" />
          <RadialGauge value={100 - safety.jurisdiction_violation_rate} label="Jurisdiction Adherence" color="var(--color-brand-navy)" />
          <RadialGauge value={safety.high_risk_review_detection} label="High-Risk Detection" color="var(--color-danger)" />
        </div>

        {/* Right Column - Stats & Failures */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Failure Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-dangerBg/50 border border-danger/20">
                <span className="text-sm font-bold text-danger">Critical Failures</span>
                <span className="text-xl font-mono font-bold text-danger"><CountUp end={failures.critical_failures} /></span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-warningBg/50 border border-warning/20">
                <span className="text-sm font-bold text-warning">High Failures</span>
                <span className="text-xl font-mono font-bold text-warning"><CountUp end={failures.high_failures} /></span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-surface-border">
                <span className="text-sm font-bold text-text-secondary">Warnings</span>
                <span className="text-xl font-mono font-bold text-text-main"><CountUp end={failures.warnings} /></span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-navy" /> Retrieval Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Recall@K</div>
                <div className="text-2xl font-mono font-bold text-brand-navy">{retrieval.recall_at_k.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-text-muted mb-1">MRR</div>
                <div className="text-2xl font-mono font-bold text-brand-navy">{retrieval.mrr.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-4 text-xs font-medium text-text-muted bg-surface-subtle p-2 rounded border border-surface-border">
              Note: Retrieval metrics are under improvement.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Timings & Dataset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-chakra" /> Pipeline Latency (ms)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                <XAxis type="number" tick={{fontSize: 12, fill: 'var(--color-text-secondary)'}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 600, fill: 'var(--color-brand-navy)'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'var(--color-surface-subtle)'}} contentStyle={{borderRadius: '8px', border: '1px solid var(--color-border)'}} />
                <Bar dataKey="ms" radius={[0, 4, 4, 0]} barSize={32}>
                  {timingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border flex justify-between items-center text-sm">
            <span className="font-bold text-text-secondary">Total Response Time</span>
            <span className="font-mono font-bold text-brand-navy text-lg">{timings.total_time_ms} ms</span>
          </div>
        </div>

        <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-surface-subtle border border-surface-border rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-brand-navy" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy mb-2">Dataset Information</h3>
          <p className="text-text-secondary mb-6 max-w-sm">
            Evaluation was run against the standardized SIH ground-truth dataset for Intellectual Property and Regulatory Compliance.
          </p>
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-mono font-bold text-brand-navy"><CountUp end={summary.dataset_size} /></div>
              <div className="text-xs uppercase font-bold text-text-muted mt-1">Total Cases</div>
            </div>
            <div>
              <div className="text-3xl font-mono font-bold text-verified"><CountUp end={summary.tests_passed} /></div>
              <div className="text-xs uppercase font-bold text-text-muted mt-1">Passed</div>
            </div>
            <div>
              <div className="text-3xl font-mono font-bold text-danger"><CountUp end={summary.tests_failed} /></div>
              <div className="text-xs uppercase font-bold text-text-muted mt-1">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
