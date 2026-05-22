'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Building2, BarChart3, Shield, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Landmark Track</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <span className="text-sm text-text-secondary hover:text-text-primary px-3 py-2">Sign in</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-all"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-20 pb-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Built for South African landlords
        </span>
        <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight font-display">
          Property management,<br />
          <span className="bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
            finally simple.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
          Track every property, unit, tenant, lease, and rand. Landmark Track replaces spreadsheets
          with a beautiful, mobile-first dashboard your portfolio deserves.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-all"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 font-display">
          Everything you need to manage your portfolio
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Building2, title: 'Multi-property portfolio', desc: 'Unlimited properties, buildings, and units in one place.' },
            { icon: BarChart3, title: 'Rent collection tracking', desc: 'Know who paid, who\'s late, and what\'s owed at a glance.' },
            { icon: Shield, title: 'Lease & inspection records', desc: 'Documents, photos, and inspection scores tied to every unit.' },
            { icon: Smartphone, title: 'Mobile-first design', desc: 'Inspect units, log payments, and manage tickets on the go.' },
            { icon: CheckCircle2, title: 'Maintenance workflow', desc: 'Tenants report, you assign, contractors complete — all tracked.' },
            { icon: BarChart3, title: 'Executive reporting', desc: 'Revenue trends, occupancy rates, vacancy losses — exportable reports.' },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-display">Ready to take control?</h2>
          <p className="mt-3 text-text-secondary">Sign up free. No credit card required.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-all"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        &copy; {new Date().getFullYear()} Landmark Track. All rights reserved.
      </footer>
    </div>
  );
}
