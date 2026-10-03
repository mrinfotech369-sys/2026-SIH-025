'use client';

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, get, getJurisdictions, getWorkspaceId, setJurisdictions as setJurisdictionsStorage, setWorkspaceId } from './api';
import { i18n, Language } from './i18n';
import { useTrackNavigation } from '@/components/back';
import type { Jurisdiction, User } from './types';

type AppCtx = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (typeof i18n)['en'];
  user: User | null | undefined;
  userLoading: boolean;
  workspaceId: string | null;
  switchWorkspace: (id: string) => void;
  jurisdictions: Jurisdiction[];
  setJurisdictions: (js: Jurisdiction[]) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && [401, 403, 404, 422].includes(err.status)) && count < 2,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <AppProvider>{children}</AppProvider>
    </QueryClientProvider>
  );
}

function AppProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  useTrackNavigation();
  const [lang, setLangState] = useState<Language>('en');
  const [workspaceId, setWs] = useState<string | null>(null);
  const [jurisdictions, setJurs] = useState<Jurisdiction[]>([]);

  useEffect(() => {
    try {
      const l = window.localStorage.getItem('ipsakti.lang');
      if (l === 'en' || l === 'hi') setLangState(l);
    } catch {}
    setWs(getWorkspaceId());
    setJurs(getJurisdictions() as Jurisdiction[]);
  }, []);

  const me = useQuery({ queryKey: ['me'], queryFn: () => get<User | null>('/auth/session'), retry: false });

  useEffect(() => {
    const u = me.data;
    if (u && u.workspaces.length && !u.workspaces.some((w) => w.id === workspaceId)) {
      setWorkspaceId(u.workspaces[0].id);
      setWs(u.workspaces[0].id);
    }
  }, [me.data, workspaceId]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<AppCtx>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        try {
          window.localStorage.setItem('ipsakti.lang', l);
        } catch {}
      },
      t: i18n[lang],
      user: me.isError ? null : me.data,
      userLoading: me.isLoading,
      workspaceId,
      switchWorkspace: (id) => {
        setWorkspaceId(id);
        setWs(id);
        qc.invalidateQueries();
      },
      jurisdictions,
      setJurisdictions: (js) => {
        setJurisdictionsStorage(js);
        setJurs(js);
      },
    }),
    [lang, me.data, me.isError, me.isLoading, workspaceId, jurisdictions, qc]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside <Providers>');
  return c;
}
