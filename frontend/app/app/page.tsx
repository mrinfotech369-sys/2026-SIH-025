'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { InnovationCardView } from '@/components/innovation-card';
import { Button, EmptyState, ErrorState, PageHeader, Spinner, fmtDateTime, cx } from '@/components/ui';
import { JurisdictionBadge, GlassCard, StatCard, GradientButton } from '@/components/nyaya/ui';
import { get } from '@/lib/api';
import { useApp } from '@/lib/providers';
import type { InnovationCard, Jurisdiction } from '@/lib/types';
import { Check, Settings2, Activity, FileText, Database, ShieldAlert, FileSearch, ArrowRight, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const JURISDICTION_OPTIONS: [Jurisdiction, string][] = [['IN', 'India'], ['US', 'USA'], ['AU', 'Australia']];

function ActiveJurisdiction() {
  const { jurisdictions, setJurisdictions } = useApp();
  const [editing, setEditing] = useState(false);
  const toggle = (j: Jurisdiction) => setJurisdictions(jurisdictions.includes(j) ? jurisdictions.filter((x) => x !== j) : [...jurisdictions, j]);
  return (
    <div className="mb-6 flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm bg-surface-elevated/50 border border-surface-border backdrop-blur-md rounded-lg px-4 py-2 shadow-sm">
        <span className="text-text-secondary font-medium mr-2">{jurisdictions.length > 1 ? 'Active Jurisdictions' : 'Active Jurisdiction'}</span>
        {jurisdictions.length ? jurisdictions.map((j) => <JurisdictionBadge key={j} j={j as any} />) : <span className="text-text-muted">None selected</span>}
        <div className="h-4 w-px bg-surface-border mx-2"></div>
        <button className="text-xs font-medium text-primary hover:text-primaryHover transition-colors flex items-center gap-1" onClick={() => setEditing((v) => !v)}>
          <Settings2 className="w-3.5 h-3.5" /> Configure
        </button>
      </div>
      
      {editing && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs shadow-glass-glow">
          {JURISDICTION_OPTIONS.map(([code, name]) => {
            const isActive = jurisdictions.includes(code);
            return (
              <button 
                key={code} 
                onClick={() => toggle(code)}
                className={cx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200",
                  isActive ? "bg-primary/20 border-primary text-primary shadow-sm" : "bg-surface-elevated border-surface-border text-text-secondary hover:border-surface-border/80 hover:text-white"
                )}
              >
                <div className={cx("w-4 h-4 rounded-sm flex items-center justify-center border", isActive ? "bg-primary border-primary text-darkbg" : "border-surface-border bg-transparent")}>
                  {isActive && <Check className="w-3 h-3" />}
                </div>
                {name}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  login: 'Signed in', innovation_created: 'Created innovation', innovation_updated: 'Updated', profile_generated: 'Generated profile',
  search_started: 'Started research', search_completed: 'Completed research', citation_verified: 'Verified a citation',
  report_generated: 'Generated a report', report_exported: 'Exported a report', escalation_created: 'Created an escalation',
  document_ingested: 'Ingested a document', document_viewed: 'Viewed a document', evidence_added: 'Added evidence',
  classification_analyzed: 'Ran classification', analysis_completed: 'Completed analysis', gap_status_changed: 'Updated a gap',
  workspace_setting_changed: 'Changed workspace settings', source_modified: 'Modified a source', escalation_status_changed: 'Updated an escalation',
};

export default function Dashboard() {
  const { t, user } = useApp();
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => get('/dashboard') });
  const inns = useQuery({ queryKey: ['innovations'], queryFn: () => get<InnovationCard[]>('/innovations') });
  const s = dash.data?.stats;

  return (
    <div className="pb-12 bg-darkbg min-h-screen relative">
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10">
        <PageHeader
          eyebrow={t.nav.dashboard}
          title={`Welcome back, ${user?.name.split(' ')[0]}`}
          subtitle="Your workspace's innovations, evidence, and open review items."
          actions={
            <div className="flex items-center gap-3">
              <GradientButton href="/app/assistant" variant="ghost" className="border-surface-border bg-surface-elevated text-text-main shadow-sm h-10">
                {t.nav.assistant}
              </GradientButton>
              <GradientButton href="/app/innovations/new" variant="primary" className="shadow-primary-glow h-10">
                {t.nav.createInnovation}
              </GradientButton>
            </div>
          }
        />
        
        <ActiveJurisdiction />
        
        {dash.isError ? (
          <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 mt-2">
            <StatCard label="Total innovations" value={s?.total_innovations ?? '…'} icon={<Layers className="w-4 h-4" />} />
            <StatCard label="Active research" value={s?.active_research ?? '…'} icon={<Activity className="w-4 h-4" />} variant="active" />
            <StatCard label="Evidence found" value={s?.evidence_found ?? '…'} hint="passages linked" icon={<Database className="w-4 h-4" />} />
            <StatCard label="Prior-art matches" value={s?.prior_art_matches ?? '…'} hint="distinct patents" icon={<FileSearch className="w-4 h-4" />} />
            <StatCard label="Evidence gaps" value={s?.evidence_gaps ?? '…'} hint="open" icon={<FileText className="w-4 h-4" />} />
            <StatCard label="Pending reviews" value={s?.pending_reviews ?? '…'} hint="patent matches" icon={<Activity className="w-4 h-4" />} variant="warning" />
            <StatCard label="Open escalations" value={s?.open_escalations ?? '…'} icon={<ShieldAlert className="w-4 h-4" />} variant="danger" />
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Recent Innovations
              </h2>
              <Link href="/app/innovations" className="text-xs font-medium text-primary hover:text-primaryHover flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            {inns.isLoading && <div className="py-12 flex justify-center"><Spinner /></div>}
            {inns.isError && <ErrorState error={inns.error} onRetry={() => inns.refetch()} />}
            {inns.data && inns.data.length === 0 && (
              <GlassCard className="p-8 text-center bg-surface-elevated/40 border-dashed">
                <EmptyState title="No innovations yet" action={<GradientButton href="/app/innovations/new">{t.nav.createInnovation}</GradientButton>}>
                  Profile your first formulation to start evidence discovery and automated verification.
                </EmptyState>
              </GlassCard>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {inns.data?.slice(0, 6).map((i, idx) => (
                <motion.div key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <InnovationCardView inn={i} />
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Activity className="w-4 h-4 text-shakti" /> Recent Activity
            </h2>
            <GlassCard hover className="bg-surface-elevated/60 backdrop-blur-md overflow-hidden">
              <div className="p-5 border-b border-surface-border flex justify-between items-center">
                <h3 className="font-semibold text-white text-sm">Audit Trail</h3>
                <Link href="/app/audit" className="text-xs font-medium text-text-muted hover:text-white transition-colors">View all</Link>
              </div>
              
              <div className="p-5">
                {dash.isLoading && <div className="py-4 flex justify-center"><Spinner size="sm" /></div>}
                {dash.data?.recent_activity?.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No activity yet.</p>}
                
                <div className="relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-border before:to-transparent">
                  <ol className="space-y-5 relative">
                    {dash.data?.recent_activity?.map((a: any, i: number) => (
                      <li key={i} className="relative flex items-start gap-4">
                        <div className="absolute left-0 mt-1.5 w-4 h-4 rounded-full bg-darkbg border-2 border-primary/50 shadow-[0_0_8px_rgba(201,162,74,0.3)] z-10"></div>
                        <div className="pl-8 flex flex-col w-full">
                          <div className="text-[13px] leading-tight text-white mb-0.5">
                            <span className="font-semibold text-primary/90 mr-1">{a.user || 'System'}</span> 
                            {ACTION_LABEL[a.action] || a.action.replace(/_/g, ' ')}
                            {a.entity_name && (
                              <span className="text-text-secondary">
                                {' on '}<Link className="text-white hover:text-primary transition-colors font-medium border-b border-primary/30 hover:border-primary" href={`/app/innovations/${a.entity_id}`}>{a.entity_name}</Link>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-muted uppercase tracking-wider">{fmtDateTime(a.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
