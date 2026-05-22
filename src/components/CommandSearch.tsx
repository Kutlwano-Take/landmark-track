'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Home, Users, FileText, DollarSign, Wrench, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: 'home' | 'users' | 'file' | 'dollar' | 'wrench';
}

export default function CommandSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const { data: properties } = useQuery({
    queryKey: ['search-properties', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('id, name, city').eq('owner_id', user!.id).limit(20);
      return (data ?? []) as { id: string; name: string; city: string }[];
    },
    enabled: !!user && open,
  });

  const { data: tenants } = useQuery({
    queryKey: ['search-tenants', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, full_name, phone').eq('owner_id', user!.id).limit(20);
      return (data ?? []) as { id: string; full_name: string; phone: string | null }[];
    },
    enabled: !!user && open,
  });

  const { data: units } = useQuery({
    queryKey: ['search-units', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('id, unit_number').eq('owner_id', user!.id).limit(20);
      return (data ?? []) as { id: string; unit_number: string }[];
    },
    enabled: !!user && open,
  });

  const results: SearchResult[] = [
    ...(properties ?? [])
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.city.toLowerCase().includes(query.toLowerCase()))
      .map((p) => ({ id: p.id, label: p.name, sublabel: p.city, href: '/dashboard/properties', icon: 'home' as const })),
    ...(tenants ?? [])
      .filter((t) => t.full_name.toLowerCase().includes(query.toLowerCase()))
      .map((t) => ({ id: t.id, label: t.full_name, sublabel: t.phone ?? '', href: '/dashboard/tenants', icon: 'users' as const })),
    ...(units ?? [])
      .filter((u) => u.unit_number.toLowerCase().includes(query.toLowerCase()))
      .map((u) => ({ id: u.id, label: `Unit ${u.unit_number}`, sublabel: '', href: '/dashboard/properties', icon: 'home' as const })),
  ];

  const icons: Record<string, React.ElementType> = {
    home: Home, users: Users, file: FileText, dollar: DollarSign, wrench: Wrench,
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="ml-4 px-1.5 py-0.5 rounded border border-border text-[10px] bg-surface-light">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] pt-[15vh] p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-surface rounded-xl border border-border w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <Search className="h-4 w-4 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search properties, tenants, units..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
                  if (e.key === 'Enter' && results[activeIndex]) {
                    router.push(results[activeIndex].href);
                    setOpen(false);
                  }
                }}
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-surface-light">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {query.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">Type to start searching</p>
              ) : results.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">No results found</p>
              ) : (
                results.map((result, i) => {
                  const Icon = icons[result.icon];
                  return (
                    <button
                      key={`${result.icon}-${result.id}`}
                      onClick={() => { router.push(result.href); setOpen(false); }}
                      className={cn(
                        'flex items-center gap-3 w-full p-2.5 rounded-lg text-sm transition-colors',
                        i === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-surface-light',
                      )}
                    >
                      <div className={cn(
                        'grid h-8 w-8 place-items-center rounded-lg',
                        i === activeIndex ? 'bg-primary/20' : 'bg-surface-light',
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{result.label}</p>
                        {result.sublabel && <p className="text-xs text-text-secondary">{result.sublabel}</p>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
