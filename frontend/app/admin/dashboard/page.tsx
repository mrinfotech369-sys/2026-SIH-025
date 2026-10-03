'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Button, ErrorState, PageHeader, Spinner, fmtDateTime, cx } from '@/components/ui';
import { StatCard, GlassCard, GradientButton } from '@/components/nyaya/ui';
import { get, post } from '@/lib/api';
import { useAdmin } from '@/lib/admin';
import { ShieldCheck, Server, FileText, Users, Activity, Settings, Database, ShieldAlert, Cpu, Network, Zap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const { admin } = useAdmin();
  const ov = useQuery({ queryKey: ['admin-overview'], queryFn: () => get('/admin/overview'), refetchInterval: 30_000 });
  const purge = useMutation({ mutationFn: (dry: boolean) => post(`/admin/retention/run?dry_run=${dry}`) });
  const d = ov.data;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow={<div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Admin Gateway</div>} 
        title={`Welcome, ${admin?.name.split(' ')[0]}`} 
        subtitle="System-wide analytics, health monitoring, and governance." 
      />
      
      {ov.isError && <ErrorState error={ov.error} onRetry={() => ov.refetch()} />}
      {ov.isLoading && <div className="flex justify-center py-12"><Spinner /></div>}
      
      {d && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
            {Object.entries(d.counts).map(([k, v], idx) => {
              const label = k.replace(/_/g, ' ');
              let icon = <Database className="w-4 h-4" />;
              let variant: 'default' | 'active' | 'warning' | 'danger' = 'default';
              
              if (k.includes('escalations') || k.includes('failed')) {
                icon = <ShieldAlert className="w-4 h-4" />;
                variant = 'danger';
              } else if (k.includes('users') || k.includes('workspaces')) {
                icon = <Users className="w-4 h-4" />;
              } else if (k.includes('due_review')) {
                icon = <Activity className="w-4 h-4" />;
                variant = 'warning';
              } else if (k.includes('sources')) {
                icon = <Server className="w-4 h-4" />;
              }
              
              return (
                <motion.div key={k} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                  <StatCard 
                    label={label} 
                    value={v as number}
                    icon={icon}
                    variant={variant}
                    href={{ open_escalations: '/admin/escalations', open_feedback: '/admin/feedback', sources: '/admin/sources', documents: '/admin/documents',
                            users: '/admin/users', workspaces: '/admin/workspaces', sources_due_review: '/admin/documents', failed_ingestion_jobs: '/admin/documents' }[k]} 
                  />
                </motion.div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <GlassCard hover className="bg-surface-elevated/40 border-surface-border p-5">
              <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                <Cpu className="w-5 h-5 text-primary" /> Language Model Status
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-surface-border/50">
                  <dt className="text-text-secondary">Provider</dt>
                  <dd className="font-mono text-xs bg-darkbg px-2 py-1 rounded text-white">{d.llm.provider}</dd>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-surface-border/50">
                  <dt className="text-text-secondary">Status</dt>
                  <dd><Badge tone={d.llm.available ? 'ok' : 'warn'}>{d.llm.available ? 'Connected' : 'Extractive mode (no key)'}</Badge></dd>
                </div>
              </dl>
            </GlassCard>
            
            <GlassCard hover className="bg-surface-elevated/40 border-surface-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Network className="w-5 h-5 text-shakti" /> Citations (All time)
                </div>
                <Link href="/admin/citations" className="text-xs font-medium text-primary hover:text-primaryHover transition-colors">Details →</Link>
              </div>
              <dl className="space-y-3 text-sm">
                {Object.entries(d.citations.by_status).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center pb-2 border-b border-surface-border/50">
                    <dt className="text-text-secondary capitalize">{k.replace('_', ' ')}</dt>
                    <dd className="font-medium text-white">{v as number}</dd>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1 font-semibold text-white">
                  <dt>Unsupported rate</dt>
                  <dd className="text-danger">{d.citations.unsupported_rate}</dd>
                </div>
              </dl>
            </GlassCard>
            
            <GlassCard hover className="bg-surface-elevated/40 border-surface-border p-5">
              <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                <Zap className="w-5 h-5 text-green" /> Runtime Performance
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-surface-border/50">
                  <dt className="text-text-secondary">Queries sampled</dt>
                  <dd className="font-medium text-white">{d.runtime.queries_sampled}</dd>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-surface-border/50">
                  <dt className="text-text-secondary">Latency p50 / p95</dt>
                  <dd className="font-mono text-xs text-text-muted">{d.runtime.latency_ms.p50 ?? '—'} / {d.runtime.latency_ms.p95 ?? '—'} ms</dd>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <dt className="text-text-secondary">Avg cost / query</dt>
                  <dd className="font-mono text-sm text-green">${d.runtime.avg_cost_per_query_usd}</dd>
                </div>
              </dl>
            </GlassCard>
          </div>

          {d.recent_errors?.length > 0 && (
            <GlassCard className="bg-danger/5 border-danger/20 p-5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="flex flex-col mb-4 relative z-10">
                <h3 className="flex items-center gap-2 text-white font-semibold">
                  <ShieldAlert className="w-5 h-5 text-danger" /> 
                  Recent system errors ({d.recent_errors.length})
                </h3>
                <p className="text-xs text-text-muted mt-1">Unhandled server errors since the process started.</p>
              </div>
              
              <ul className="space-y-2 text-xs relative z-10 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {d.recent_errors.map((e: any, i: number) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-darkbg/50 rounded-lg p-3 border border-surface-border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="danger" className="text-[10px]">{e.error}</Badge> 
                      <span className="font-mono text-text-secondary">{e.method}</span>
                      <span className="text-white truncate max-w-[200px]" title={e.path}>{e.path}</span>
                    </div>
                    <div className="text-text-muted font-mono text-[10px] flex gap-2">
                      <span>{fmtDateTime(e.at)}</span>
                      <span className="opacity-50">·</span>
                      <span>{e.request_id}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          <GlassCard className="bg-surface-elevated/40 border-surface-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-white font-semibold mb-1">
                  <Settings className="w-5 h-5 text-primary" /> 
                  Retention policy enforcement
                </h3>
                <p className="text-sm text-text-muted max-w-2xl">
                  Deletes conversations and workspace uploads older than each workspace&apos;s retention policy. Audit logs are always kept.
                </p>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                <Button size="sm" variant="secondary" className="bg-surface-muted text-white border-surface-border" onClick={() => purge.mutate(true)} loading={purge.isPending}>Dry run</Button>
                <Button size="sm" variant="danger" onClick={() => window.confirm('Delete conversations and uploads older than each workspace retention policy?') && purge.mutate(false)}>Apply Policy</Button>
              </div>
            </div>
            
            {purge.data && (
              <div className="mt-5 p-4 bg-darkbg rounded-lg border border-surface-border">
                <ul className="space-y-2 text-xs font-mono">
                  {(purge.data as any).workspaces.map((w: any) => (
                    <li key={w.workspace} className="flex items-center gap-2 text-text-secondary">
                      <span className={cx("w-2 h-2 rounded-full", (purge.data as any).dry_run ? "bg-primary" : "bg-danger")}></span>
                      <span className="text-white">{(purge.data as any).dry_run ? 'Would delete' : 'Deleted'}</span> 
                      {w.conversations} conversations, {w.uploaded_documents} uploads 
                      <span className="text-text-muted">— {w.workspace} ({w.policy})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCard>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Users & Access', '/admin/users', Users], 
              ['Source Registry', '/admin/sources', Database], 
              ['Document Knowledge', '/admin/documents', FileText],
              ['RAG Monitoring', '/admin/rag', Activity], 
              ['Citation Verification', '/admin/citations', ShieldCheck], 
              ['System Escalations', '/admin/escalations', ShieldAlert],
              ['Audit Trail', '/admin/audit-logs', FileText], 
              ['Global Settings', '/admin/settings', Settings],
            ].map(([label, href, Icon]: any) => (
              <Link key={href} href={href} className="group flex items-center justify-between rounded-xl border border-surface-border bg-surface-elevated/40 px-4 py-3 font-medium hover:border-primary/50 hover:bg-primary/5 transition-all duration-200">
                <span className="flex items-center gap-2 text-sm text-text-secondary group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  {label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
