'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError, post, setWorkspaceId } from '@/lib/api';
import { useApp } from '@/lib/providers';
import { BackLink } from './back';
import { Field, Notice, cx } from './ui';
import { GlassCard, GradientButton } from './nyaya/ui';
import { motion, AnimatePresence } from 'framer-motion';

/** 'login' also renders the User/Admin toggle (see AuthRoleToggle below); 'register' is user-only. */
export function AuthForm({ mode, initialRole = 'user' }: { mode: 'login' | 'register'; initialRole?: 'user' | 'admin' }) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { t, lang } = useApp();
  const demo = params.get('demo') === '1';
  const [role, setRole] = useState<'user' | 'admin'>(mode === 'login' ? initialRole : 'user');
  const [form, setForm] = useState({
    name: '', email: demo ? 'researcher@ipsakti.demo' : '', password: demo ? 'Demo@12345' : '', workspace: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reason = params.get('reason');
  const admin = mode === 'login' && role === 'admin';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (mode === 'register' && !/(?=.*[A-Za-z])(?=.*\d).{8,}/.test(form.password)) {
      setErr('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    setBusy(true);
    try {
      if (admin) {
        await post('/auth/admin/login', { email: form.email, password: form.password });
        await qc.invalidateQueries({ queryKey: ['admin-session'] });
        router.push(params.get('next') || '/admin/dashboard');
        return;
      }
      const data = await post<any>(mode === 'login' ? '/auth/login' : '/auth/register',
        mode === 'login' ? { email: form.email, password: form.password } : { name: form.name, email: form.email, password: form.password, workspace: form.workspace || undefined });
      if (data.user.workspaces[0]) setWorkspaceId(data.user.workspaces[0].id);
      await qc.invalidateQueries();
      router.push(params.get('next') || '/app');
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid min-h-screen place-items-center px-4 bg-darkbg relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-shakti/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-white transition-colors group">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
            {lang === 'hi' ? 'होम पर वापस' : 'Back to home'}
          </Link>
        </div>
        
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className={cx(
              'grid h-12 w-12 place-items-center rounded-xl shadow-glass-glow transition-all duration-300 group-hover:scale-105', 
              admin ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface-elevated text-gold border border-gold/30'
            )}>
              {admin ? <ShieldCheck className="h-6 w-6" /> : <span className="font-serif text-2xl font-bold text-shakti">स</span>}
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-tight text-white group-hover:text-gold transition-colors">{admin ? 'IP-SAKTI Admin' : t.appTitle}</span>
              <span className="text-xs font-medium tracking-widest text-text-muted uppercase">Nyaya Design System</span>
            </div>
          </Link>
        </div>

        <GlassCard className="p-8 shadow-2xl backdrop-blur-xl bg-surface-elevated/70 border-surface-border">
          {mode === 'login' && (
            <div className="mb-6 flex p-1 bg-darkbg/50 rounded-lg border border-surface-border/50 relative overflow-hidden" role="tablist" aria-label="Sign in as">
              <div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface-elevated border border-surface-border rounded-md shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ left: admin ? 'calc(50% + 2px)' : '4px' }}
              />
              <button type="button" role="tab" aria-selected={!admin} onClick={() => setRole('user')}
                className={cx('relative w-1/2 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors z-10', 
                !admin ? 'text-white' : 'text-text-muted hover:text-white')}>
                <User className="w-4 h-4" /> User
              </button>
              <button type="button" role="tab" aria-selected={admin} onClick={() => setRole('admin')}
                className={cx('relative w-1/2 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors z-10', 
                admin ? 'text-primary drop-shadow-[0_0_8px_rgba(201,162,74,0.5)]' : 'text-text-muted hover:text-white')}>
                <ShieldCheck className="w-4 h-4" /> Admin
              </button>
            </div>
          )}

          <div className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-white tracking-tight">
              {admin ? 'Admin Gateway' : mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {admin ? 'Restricted access for system administrators only.' : mode === 'login' ? 'Enter your credentials to access your workspace.' : 'Join the trustworthy IP research platform.'}
            </p>
          </div>

          <AnimatePresence mode="popLayout">
            {reason === 'expired' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <Notice tone="info">Your {admin ? 'admin ' : ''}session expired. Please sign in again.</Notice>
              </motion.div>
            )}
            
            {demo && mode === 'login' && !admin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <Notice tone="info" title="Demo Environment">Using pre-configured researcher credentials.</Notice>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <Field label="Full name" required>
                <input className="w-full bg-darkbg/50 border-surface-border text-white focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors rounded-md px-3 py-2" value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" />
              </Field>
            )}
            <Field label="Email address" required>
              <input className="w-full bg-darkbg/50 border-surface-border text-white focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors rounded-md px-3 py-2" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
            </Field>
            <Field label="Password" required hint={mode === 'register' ? 'At least 8 characters with a letter and a number.' : undefined}>
              <input className="w-full bg-darkbg/50 border-surface-border text-white focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors rounded-md px-3 py-2" type="password" value={form.password} onChange={set('password')} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            {mode === 'register' && (
              <Field label="Workspace name" hint="Optional. You become its owner.">
                <input className="w-full bg-darkbg/50 border-surface-border text-white focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors rounded-md px-3 py-2" value={form.workspace} onChange={set('workspace')} placeholder="My Research Workspace" />
              </Field>
            )}
            
            <AnimatePresence>
              {err && (
                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="text-[13px] text-danger font-medium bg-danger/10 border border-danger/20 p-2.5 rounded-md flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </motion.p>
              )}
            </AnimatePresence>

            <GradientButton 
              type="submit" 
              className={cx('w-full mt-2 h-11', admin && 'shadow-primary-glow border-primary/50')} 
              variant={admin ? "primary" : "secondary"} 
              loading={busy}
            >
              {admin ? 'Sign in as Administrator' : mode === 'login' ? 'Sign in' : 'Create account'}
            </GradientButton>
          </form>
          
          <div className="mt-8 pt-6 border-t border-surface-border text-center">
            <p className="text-[13px] text-text-muted">
              {admin ? (
                <>Not an administrator? <button type="button" className="text-white hover:text-primary transition-colors font-medium ml-1" onClick={() => setRole('user')}>Sign in as User</button></>
              ) : mode === 'login' ? (
                <>No account? <Link className="text-white hover:text-gold transition-colors font-medium ml-1" href="/register">Create one</Link> <span className="mx-2 opacity-30">•</span> <Link className="text-white hover:text-gold transition-colors font-medium" href="/login?demo=1">Try Demo</Link></>
              ) : (
                <>Already have an account? <Link className="text-white hover:text-gold transition-colors font-medium ml-1" href="/login">Sign in</Link></>
              )}
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
