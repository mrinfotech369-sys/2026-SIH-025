'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Flag, MessageSquarePlus, RefreshCw, Send, ShieldAlert, ThumbsDown, ThumbsUp, Trash2, Bot, User, BookOpenCheck, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import { EvidenceCard, SearchTrace } from '@/components/evidence';
import {
  Badge, Button, ErrorState, Notice, ProgressSteps, Spinner, SupportBadge, cx, fmtDateTime, useStepTicker,
} from '@/components/ui';
import { JurisdictionBadge, GlassCard, AbstainCard, RiskBanner, SourceDrawer, CitationChip, TrustRing } from '@/components/nyaya/ui';
import { del, get, patch, post } from '@/lib/api';
import { useApp } from '@/lib/providers';
import type { ChatMessage, Evidence, InnovationCard, KeyPoint, ResearchPayload } from '@/lib/types';
import { motion } from 'framer-motion';

const MODES = [
  ['GENERAL', 'General research'], ['INNOVATION', 'Innovation research'], ['PATENT', 'Patent research'],
  ['SCIENTIFIC', 'Scientific evidence'], ['REGULATORY', 'Regulatory research'], ['CROSS_JURISDICTION', 'Cross-jurisdiction'],
];
const EXAMPLES = [
  'What does Section 3(p) of the Indian Patents Act exclude from patentability?',
  'What label disclaimer is required for a structure/function claim on a US dietary supplement?',
  'Compare how India, USA and Australia regulate an Ayurvedic herbal product',
  'पारंपरिक ज्ञान के पेटेंट के बारे में भारत का कानून क्या कहता है?',
  'Find prior art on curcumin phospholipid complex with piperine',
  'Give me the full TKDL records for Ashwagandha formulations',
];

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Spinner /></div>}>
      <Assistant />
    </Suspense>
  );
}

function Assistant() {
  const { t, lang, jurisdictions, setJurisdictions } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [convId, setConvId] = useState<string | null>(params.get('c'));
  const [innovationId, setInnovationId] = useState<string>(params.get('innovation') || '');
  const [mode, setMode] = useState(params.get('innovation') ? 'INNOVATION' : 'GENERAL');
  
  const urlJur = params.get('jur');
  useEffect(() => {
    if (urlJur) setJurisdictions([urlJur as any]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlJur]);
  const jur = jurisdictions[0] || '';
  const [maxTier, setMaxTier] = useState('');
  const [text, setText] = useState('');
  const [openEv, setOpenEv] = useState<Evidence | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convs = useQuery({ queryKey: ['conversations'], queryFn: () => get<any[]>('/conversations') });
  const inns = useQuery({ queryKey: ['innovations'], queryFn: () => get<InnovationCard[]>('/innovations') });
  const msgs = useQuery({ queryKey: ['messages', convId], queryFn: () => get<ChatMessage[]>(`/conversations/${convId}/messages`), enabled: !!convId });

  const send = useMutation({
    mutationFn: (message: string) =>
      post<any>('/chat', {
        message, conversation_id: convId, innovation_id: innovationId || null, language: lang, jurisdiction: jur || null, mode,
        filters: maxTier ? { max_tier: Number(maxTier) } : {},
      }),
    onSuccess: (d) => {
      setConvId(d.conversation.id);
      setFocus(d.message.id);
      router.replace(`/app/assistant?c=${d.conversation.id}${innovationId ? `&innovation=${innovationId}` : ''}`);
      qc.setQueryData(['messages', d.conversation.id], (old: ChatMessage[] | undefined) => [...(old || []), d.user_message, d.message]);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
  const steps = [t.loading.terminology, 'Hybrid retrieval (dense + BM25 + metadata + graph)…', 'Reranking & deduplicating…', 'Generating answer…', t.loading.verifying, 'Checking conflicts & freshness…'];
  useStepTicker(send.isPending, steps.length, setActive, 350);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs.data?.length, send.isPending]);

  function submit(e?: FormEvent, override?: string) {
    e?.preventDefault();
    const m = (override ?? text).trim();
    if (!m || send.isPending) return;
    setText('');
    send.mutate(m);
  }

  const messages = msgs.data || [];
  const focused = messages.find((m) => m.id === focus) || [...messages].reverse().find((m) => m.role === 'assistant');
  const payload: ResearchPayload | undefined = focused?.payload;

  return (
    <div className="-mx-4 -my-6 grid h-[calc(100vh-80px)] grid-cols-1 overflow-hidden md:-mx-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_380px] bg-pagebg">
      {/* Conversations Sidebar */}
      <aside className="hidden flex-col border-r border-surface-border bg-white lg:flex" aria-label="Conversations">
        <div className="p-4 border-b border-surface-border">
          <Button className="w-full bg-brand-navy text-white hover:bg-brand-navy-light font-bold rounded-xl" onClick={() => { setConvId(null); setFocus(null); router.replace('/app/assistant'); }}>
            <MessageSquarePlus className="h-4 w-4 mr-2" /> {t.chat.newChat}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {convs.isLoading && <div className="flex justify-center p-4"><Spinner /></div>}
          {convs.data?.map((c) => (
            <div key={c.id} className={cx('group flex items-center rounded-lg transition-all duration-200', convId === c.id ? 'bg-surface-subtle border border-surface-border shadow-sm' : 'hover:bg-pagebg border border-transparent')}>
              <button className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={() => { setConvId(c.id); setFocus(null); router.replace(`/app/assistant?c=${c.id}`); }}>
                <div className="truncate text-sm font-bold text-brand-navy transition-colors">{c.title}</div>
                <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5 font-medium">
                  <span className="uppercase tracking-wider">{c.mode.toLowerCase()}</span>
                  <span className="w-1 h-1 rounded-full bg-surface-border"></span>
                  <span>{fmtDateTime(c.updated_at).split(',')[0]}</span>
                </div>
              </button>
              <button className="px-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete conversation"
                onClick={async () => { await del(`/conversations/${c.id}`); if (convId === c.id) setConvId(null); qc.invalidateQueries({ queryKey: ['conversations'] }); }}>
                <Trash2 className="h-4 w-4 text-text-muted hover:text-danger transition-colors" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex min-h-0 min-w-0 flex-col bg-pagebg relative">
        {/* Chat Settings Header */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 border-b border-surface-border bg-white px-6 py-3 text-xs shadow-sm">
          <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-md border border-surface-border">
            <span className="text-brand-navy font-bold">{t.chat.mode}</span>
            <select className="bg-transparent border-none text-text-main font-medium focus:ring-0 cursor-pointer outline-none" value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-md border border-surface-border">
            <span className="text-brand-navy font-bold">{t.chat.jurisdiction}</span>
            <select className="bg-transparent border-none text-text-main font-medium focus:ring-0 cursor-pointer outline-none" value={jur} onChange={(e) => setJurisdictions(e.target.value ? [e.target.value as any] : [])}>
              <option value="">{t.chat.auto}</option><option value="IN">India</option><option value="US">USA</option><option value="AU">Australia</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-md border border-surface-border hidden sm:flex">
            <span className="text-brand-navy font-bold">Sources</span>
            <select className="bg-transparent border-none text-text-main font-medium focus:ring-0 cursor-pointer outline-none" value={maxTier} onChange={(e) => setMaxTier(e.target.value)}>
              <option value="">All tiers</option><option value="1">Tier 1 only (official)</option><option value="2">Tier 1–2</option><option value="3">Tier 1–3</option>
            </select>
          </div>
        </div>

        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-8 md:px-8">
          {!convId && !send.isPending && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface border border-surface-border flex items-center justify-center mb-6 shadow-sm">
                <Bot className="w-8 h-8 text-brand-navy" />
              </div>
              <h1 className="font-heading font-bold text-4xl mb-4 text-brand-navy">How can I assist your research?</h1>
              <p className="text-base text-text-secondary max-w-xl leading-relaxed mb-10 font-medium">Answers use only authenticated sources. Every claim is bound to a cited passage and verified. When evidence is insufficient, I will explicitly abstain.</p>
              
              <div className="w-full grid gap-3 sm:grid-cols-2 text-left">
                {EXAMPLES.map((ex, i) => (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    key={ex} onClick={() => submit(undefined, ex)} 
                    className="rounded-xl border border-surface-border bg-white p-4 text-sm text-brand-navy font-medium hover:shadow-soft-elevated hover:border-chakra/30 transition-all duration-300"
                  >
                    {ex}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
          
          {msgs.isError && <ErrorState error={msgs.error} onRetry={() => msgs.refetch()} />}
          
          <div className="mx-auto max-w-3xl space-y-8 pb-10">
            {messages.map((m, idx) =>
              m.role === 'user' ? (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-navy text-white px-5 py-4 text-base shadow-sm font-medium leading-relaxed">
                    {m.content}
                  </div>
                </motion.div>
              ) : (
                <AssistantMessage key={m.id} m={m} focused={focused?.id === m.id} onFocus={() => setFocus(m.id)} onOpenEvidence={setOpenEv}
                  innovationId={innovationId || null} onReply={(r) => submit(undefined, r)}
                  onRegenerate={() => { const prev = messages[idx - 1]; if (prev?.role === 'user') submit(undefined, prev.content); }}
                  onChanged={() => qc.invalidateQueries({ queryKey: ['messages', convId] })} />
              )
            )}
            
            {send.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white border border-surface-border flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot className="w-5 h-5 text-chakra animate-pulse" />
                </div>
                <div className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm border border-surface-border bg-white p-5 shadow-sm">
                  <ProgressSteps steps={steps} active={active} />
                </div>
              </motion.div>
            )}
            {send.isError && <ErrorState error={send.error} onRetry={() => send.variables && send.mutate(send.variables)} />}
          </div>
        </div>

        {/* Sticky Composer */}
        <div className="relative z-10 border-t border-surface-border bg-white/95 backdrop-blur-xl p-4 md:p-6 shadow-[0_-10px_30px_rgba(11,18,48,0.05)]">
          <form onSubmit={submit} className="mx-auto max-w-3xl relative">
            <div className="relative flex items-end gap-3 rounded-xl border-2 border-surface-border bg-white p-2 shadow-sm focus-within:border-chakra focus-within:ring-4 focus-within:ring-chakra/10 transition-all">
              <textarea 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                rows={1} 
                className="flex-1 max-h-32 min-h-[44px] resize-none bg-transparent px-3 py-2.5 text-base font-medium text-brand-navy placeholder-text-muted focus:outline-none scrollbar-hide" 
                placeholder={t.chat.placeholder + " (Ctrl+K to search)"} 
                aria-label="Message"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} 
                maxLength={4000} 
              />
              <button 
                type="submit" 
                disabled={!text.trim() || send.isPending}
                className="mb-1 h-12 w-12 shrink-0 rounded-lg bg-shakti text-brand-navy flex items-center justify-center transition-all hover:bg-shaktiHover disabled:opacity-50 shadow-sm font-bold"
              >
                {send.isPending ? <Spinner /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-text-secondary font-semibold tracking-wide">{t.boundary}</p>
          </form>
        </div>
      </section>

      {/* Evidence Sidebar */}
      <aside className="hidden overflow-y-auto border-l border-surface-border bg-white p-5 xl:block shadow-[-10px_0_30px_rgba(11,18,48,0.02)]" aria-label="Evidence panel">
        <div className="flex items-center gap-2 mb-6">
          <BookOpenCheck className="w-5 h-5 text-chakra" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-navy">Source Verification</h2>
        </div>
        
        {!payload?.evidence?.length && (
          <div className="flex flex-col items-center justify-center h-40 text-center border-2 border-dashed border-surface-border rounded-xl bg-pagebg">
            <Search className="w-6 h-6 text-text-muted mb-2 opacity-50" />
            <p className="text-sm font-medium text-text-muted max-w-[150px]">Evidence for the selected answer appears here.</p>
          </div>
        )}
        
        <div className="space-y-4">
          {payload?.evidence?.map((e) => (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={e.chunk_id}>
              <EvidenceCard e={e} innovationId={innovationId || null} onOpen={setOpenEv} compact />
            </motion.div>
          ))}
        </div>
      </aside>
      
      {openEv && <SourceDrawer open={true} title={openEv.title} content={openEv.passage} onClose={() => setOpenEv(null)} />}
    </div>
  );
}

function AssistantMessage({ m, focused, onFocus, onOpenEvidence, innovationId, onReply, onRegenerate, onChanged }: {
  m: ChatMessage; focused: boolean; onFocus: () => void; onOpenEvidence: (e: Evidence) => void; innovationId: string | null;
  onReply: (r: string) => void; onRegenerate: () => void; onChanged: () => void;
}) {
  const { t } = useApp();
  const p: ResearchPayload = m.payload;
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const fb = useMutation({ mutationFn: (body: any) => patch(`/messages/${m.id}`, body), onSuccess: onChanged });
  const byN = Object.fromEntries((p.evidence || []).map((e) => [e.n, e]));
  
  const copy = async () => {
    const txt = [p.answer, ...(p.key_points || []).map((k) => `• ${k.text} ${k.citations.map((c) => `[${c}]`).join('')}`),
      ...(p.evidence || []).map((e) => `[${e.n}] ${e.title} — ${e.authority}${e.section ? `, ${e.section}` : ''}`)].join('\n');
    await navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHighRisk = p.analysis?.intent === 'HIGH_RISK_LEGAL' || p.flagged;

  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onFocus} 
      className={cx(
        'group relative flex gap-4 cursor-default transition-all duration-300',
        focused ? 'opacity-100' : 'opacity-70 hover:opacity-100'
      )} 
      lang={p.language}
    >
      {/* Avatar */}
      <div className={cx(
        "w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 shadow-sm transition-colors",
        focused ? "bg-white border-chakra" : "bg-surface-subtle border-surface-border"
      )}>
        <Bot className={cx("w-5 h-5", focused ? "text-chakra" : "text-text-muted group-hover:text-brand-navy")} />
      </div>

      <div className={cx(
        'flex-1 max-w-[90%] rounded-2xl rounded-tl-sm border-2 p-6 transition-all duration-300', 
        focused ? 'bg-white border-brand-navy/20 shadow-soft-elevated' : 'bg-white/80 border-surface-border hover:bg-white hover:border-surface-border'
      )}>
        {/* High Risk Banner */}
        {isHighRisk && (
          <RiskBanner message="High-risk query — human legal review recommended" />
        )}

        {/* Metadata Badges */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className={cx(
            "px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider",
            p.type === 'abstention' ? 'bg-warningBg text-warning border border-warning/30' : 
            p.type === 'clarification' ? 'bg-surface-subtle text-brand-navy border border-surface-border' : 
            p.type === 'answer_with_boundary' ? 'bg-chakra/10 text-chakra border border-chakra/20' : 
            'bg-verifiedBg text-verified border border-verified/30'
          )}>
            {p.type === 'abstention' ? 'Abstained' : p.type === 'clarification' ? 'Needs clarification' : p.type === 'answer_with_boundary' ? 'Answer with boundary' : t.chat.answer}
          </span>
          
          <TrustRing score={p.confidence?.score ? p.confidence.score * 100 : 100} label="Score" />
          
          {(p.analysis?.jurisdictions || []).map((j: string) => <JurisdictionBadge key={j} jurisdiction={j} />)}
          
          {p.evidence?.some((e) => e.is_demo) && <span className="px-2 py-1 rounded bg-shakti/20 text-brand-navy font-bold text-[11px] uppercase">{t.demo}</span>}
          {p.tkdl_access && <span className="px-2 py-1 rounded bg-shakti/20 text-brand-navy font-bold text-[11px] uppercase" title={p.tkdl_access.meaning}>{p.tkdl_access.label}</span>}
          
          <span className="ml-auto text-xs font-bold text-text-muted">{fmtDateTime(m.created_at).split(',')[1]}</span>
        </div>

        {/* Answer Text */}
        <div className="prose prose-sm max-w-none text-base leading-relaxed text-brand-navy font-medium">
          {/* Mock rendering of citation chips inline for the demo if there's text */}
          {p.answer}
        </div>

        {/* Suggested Replies */}
        {p.suggested_replies && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-surface-border pt-4">
            {p.suggested_replies.map((r) => (
              <button 
                key={r} 
                onClick={(e) => { e.stopPropagation(); onReply(r); }}
                className="px-4 py-2 rounded-xl border border-surface-border bg-surface-subtle text-brand-navy text-sm font-bold hover:bg-surface-border hover:shadow-sm transition-all"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Abstention Card */}
        {p.abstention && (
          <div className="mt-6">
            <AbstainCard 
              reasons={[p.abstention.why]}
              nextStep={p.abstention.next_step}
            />
          </div>
        )}

        {/* Action Bar */}
        <div className={cx(
          "mt-6 pt-4 border-t border-surface-border flex flex-wrap gap-2 transition-opacity duration-300",
          focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-brand-navy hover:bg-surface-subtle transition-colors">
            <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={onRegenerate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-brand-navy hover:bg-surface-subtle transition-colors">
            <RefreshCw className="h-4 w-4" /> Regenerate
          </button>
          <div className="flex-1"></div>
          <button aria-pressed={m.feedback === 'up'} onClick={() => fb.mutate({ feedback: 'up' })} className={cx("flex items-center justify-center w-8 h-8 rounded-lg transition-colors border", m.feedback === 'up' ? "bg-verifiedBg text-verified border-verified/30" : "text-text-secondary border-transparent hover:bg-surface-subtle hover:text-brand-navy")}>
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button aria-pressed={m.feedback === 'down'} onClick={() => fb.mutate({ feedback: 'down' })} className={cx("flex items-center justify-center w-8 h-8 rounded-lg transition-colors border", m.feedback === 'down' ? "bg-warningBg text-warning border-warning/30" : "text-text-secondary border-transparent hover:bg-surface-subtle hover:text-brand-navy")}>
            <ThumbsDown className="h-4 w-4" />
          </button>
          <button onClick={() => setReporting(true)} className={cx("flex items-center justify-center w-8 h-8 rounded-lg transition-colors border", m.flagged ? "bg-dangerBg text-danger border-danger/30" : "text-text-secondary border-transparent hover:bg-surface-subtle hover:text-danger")}>
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
