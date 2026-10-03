'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, Grid3x3, Lock, MessageSquareWarning, BookOpen, Bot, ClipboardList, Database, FileStack, FileText, FlaskConical, GitBranch,
  Landmark, Layers, LayoutDashboard, Leaf, Map, PlusCircle, ScrollText, Settings, ShieldAlert,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/back';
import { Spinner, cx } from '@/components/ui';
import { get, post, setWorkspaceId } from '@/lib/api';
import { useApp } from '@/lib/providers';
import { Navbar } from '@/components/nyaya/Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, lang, user, userLoading, workspaceId, switchWorkspace } = useApp();
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const health = useQuery({ queryKey: ['health'], queryFn: () => get('/health'), refetchInterval: 60_000, enabled: !!user });

  useEffect(() => {
    if (!userLoading && user === null) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [user, userLoading, router, path]);
  
  useEffect(() => {
    setOpen(false);
  }, [path]);

  if (userLoading || !user) {
    return <div className="grid min-h-screen place-items-center"><Spinner label="Checking your session…" /></div>;
  }

  const navItems = [
    { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/app/assistant', label: 'Assistant', icon: Bot },
    { href: '/app/innovations', label: 'Innovations', icon: Leaf },
    { href: '/app/research/patents', label: 'Patents', icon: FileStack },
    { href: '/app/research/regulatory', label: 'Regulatory', icon: Landmark },
    { href: '/app/analysis/evidence', label: 'Evidence Map', icon: Map },
    { href: '/app/reports', label: 'Reports', icon: FileText },
    { href: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-darkbg">
      <Navbar items={navItems} onMenuClick={() => setOpen(!open)} isMenuOpen={open} />
      
      {/* Mobile Menu Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden pt-24 bg-darkbg/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
          {navItems.map((item) => (
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
            {path !== '/app' && <BackButton label={lang === 'hi' ? 'वापस' : 'Back'} />}
          </div>
          
          <label className="flex items-center gap-2 text-xs bg-surface-elevated border border-surface-border px-3 py-1.5 rounded-full shadow-glass-glow">
            <span className="hidden text-text-muted sm:inline">Workspace:</span>
            <select className="bg-transparent text-white outline-none border-none cursor-pointer" value={workspaceId || ''} onChange={(e) => switchWorkspace(e.target.value)} aria-label="Workspace">
              {user.workspaces.map((w) => (
                <option key={w.id} value={w.id} className="bg-darkbg text-white">{w.name} ({w.role.toLowerCase()})</option>
              ))}
            </select>
          </label>
        </header>

        <main>{children}</main>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-surface-border py-8 text-center bg-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mb-4 opacity-50"></div>
          <p className="text-text-muted text-sm font-medium">Built for Smart India Hackathon</p>
          <div className="flex items-center gap-4 mt-2">
            <span className={cx('flex items-center gap-1.5 text-xs', health.data?.status === 'ok' ? 'text-verified' : 'text-warning')}>
              <span className="w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
              System {health.data?.status || 'checking'}
            </span>
            <span className="text-text-muted text-xs">•</span>
            <span className="text-xs text-text-secondary">LLM: {health.data?.llm_provider || '…'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
