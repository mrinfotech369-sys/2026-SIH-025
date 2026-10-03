'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, ClipboardList, Database, FileStack, Gauge, LayoutDashboard, Layers, LogOut, Menu, MessageSquareWarning,
  ScrollText, Search, Settings, ShieldAlert, ShieldCheck, Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, ProfileMenu, Spinner, cx } from '@/components/ui';
import { post } from '@/lib/api';
import { AdminProvider, useAdmin } from '@/lib/admin';
import { Navbar } from '@/components/nyaya/Navbar';

const NAV: { href: string; label: string; icon: any }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Layers },
  { href: '/admin/sources', label: 'Sources', icon: Database },
  { href: '/admin/documents', label: 'Docs', icon: FileStack },
  { href: '/admin/rag', label: 'RAG', icon: Activity },
  { href: '/admin/citations', label: 'Citations', icon: ShieldCheck },
  { href: '/admin/evaluation', label: 'Evaluation', icon: Gauge },
  { href: '/admin/escalations', label: 'Escalations', icon: ClipboardList },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareWarning },
  { href: '/admin/audit-logs', label: 'Audit', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminGate>{children}</AdminGate>
    </AdminProvider>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/admin/login') return <>{children}</>;
  return <AdminShell>{children}</AdminShell>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, loading, admin, clear } = useAdmin();
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && (session?.state === 'signed_out')) {
      router.replace(`/admin/login?next=${encodeURIComponent(path)}`);
    }
  }, [loading, session, router, path]);
  
  useEffect(() => setOpen(false), [path]);

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-darkbg"><Spinner label="Checking admin session…" /></div>;
  }

  if (session.state === 'user_not_admin') {
    return <AccessDenied reason={`Signed in as ${session.user.name} (${session.user.email}), which does not have administrator access.`} />;
  }
  if (session.state === 'admin_login_required') {
    return (
      <AccessDenied
        title="Admin sign-in required"
        reason={`${session.user.name} (${session.user.email}) has administrator access, but the admin console requires its own sign-in for security — being signed in to the app is not enough.`}
        cta="Sign in to the admin console"
      />
    );
  }
  if (session.state === 'signed_out' || !admin) {
    return <div className="grid min-h-screen place-items-center bg-darkbg"><Spinner label="Redirecting to admin sign-in…" /></div>;
  }

  async function signOut() {
    try {
      await post('/auth/admin/logout');
    } finally {
      clear();
      qc.clear();
      router.replace('/admin/login');
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-darkbg">
      <Navbar items={NAV} onMenuClick={() => setOpen(!open)} isMenuOpen={open} />
      
      {/* Mobile Menu Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden pt-24 bg-darkbg/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
          {NAV.map((item) => (
            <a 
              key={item.href} 
              href={item.href} 
              className={cx("flex items-center gap-3 p-4 rounded-xl mb-2", path === item.href || path.startsWith(item.href + '/') ? "bg-primary/20 text-white border border-primary/50" : "text-text-secondary hover:bg-surface-elevated")}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-lg">{item.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto pt-28 px-4 md:px-8 pb-12">
        <header className="no-print mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-warning/20 border border-warning/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-warning shadow-glass-glow flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Admin Console
            </span>
          </div>
          
          <div className="ml-auto flex items-center gap-3">
            <ProfileMenu
              name={admin.name}
              subtitle={`${admin.email} · ${admin.role}`}
              items={[
                { label: 'Settings', href: '/admin/settings', icon: Settings },
                { label: 'Back to App', href: '/app' },
                { label: 'Sign out', onClick: signOut, icon: LogOut, danger: true },
              ]}
            />
          </div>
        </header>

        <main>{children}</main>
      </div>

      <footer className="mt-auto border-t border-surface-border py-8 text-center bg-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-warning to-transparent rounded-full mb-4 opacity-50"></div>
          <p className="text-text-muted text-sm font-medium">IP-SAKTI Administrative Console</p>
          <Link href="/app" className="text-primary hover:text-primaryHover text-sm mt-2 transition-colors">← Return to Main App</Link>
        </div>
      </footer>
    </div>
  );
}

function AccessDenied({ title = 'Access denied', reason, cta = 'Go to admin login' }: { title?: string; reason: string; cta?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-darkbg px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-elevated p-8 text-center text-white shadow-glass-glow">
        <ShieldAlert className="mx-auto h-12 w-12 text-warning" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold text-white tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed">{reason}</p>
        <p className="mt-2 text-xs text-text-muted">Administrator access is required. This is enforced on the server for every admin request.</p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Button onClick={() => (window.location.href = '/admin/login')} className="w-full sm:w-auto">{cta}</Button>
          <Link href="/app" className="w-full sm:w-auto"><Button variant="secondary" className="w-full">Back to the app</Button></Link>
        </div>
      </div>
    </div>
  );
}
