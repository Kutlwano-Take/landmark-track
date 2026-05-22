'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  LayoutDashboard,
  Home,
  Users,
  FileText,
  BarChart3,
  Wrench,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import type { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import CommandSearch from '@/components/CommandSearch';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/properties', label: 'Properties', icon: Home },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/leases', label: 'Leases', icon: FileText },
  { href: '/dashboard/payments', label: 'Payments', icon: BarChart3 },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/reports', label: 'Reports', icon: ClipboardList },
  { href: '/dashboard/inspections', label: 'Inspections', icon: ClipboardList },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setNotifications(data);
      });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold font-display">Landmark Track</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              signOut();
              router.push('/login');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-surface-light"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Building2 className="h-4 w-4" />
            {NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label ?? 'Dashboard'}
          </div>
          <CommandSearch />
        </div>

        <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-surface-light transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-error text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50">
                  <div className="p-3 border-b border-border">
                    <h3 className="font-medium text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-text-secondary text-center">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 border-b border-border last:border-0 hover:bg-surface-light">
                          <p className="text-sm font-medium">{n.title}</p>
                          {n.body && <p className="text-xs text-text-secondary mt-0.5">{n.body}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-light transition-colors"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {user.email?.[0].toUpperCase() ?? 'U'}
                </div>
                <ChevronDown className="h-3 w-3 text-text-secondary" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      router.push('/login');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-b-xl"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border grid grid-cols-4 safe-area-bottom">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 text-[10px] gap-0.5',
                active ? 'text-primary' : 'text-text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center py-2 text-[10px] gap-0.5',
            pathname === '/dashboard' ? 'text-primary' : 'text-text-muted',
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>
      </nav>
    </div>
  );
}
