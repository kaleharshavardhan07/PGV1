import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldCheck, Sparkles } from 'lucide-react';

export default function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#fffdf9] text-[#20251f]">
      <header className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f6b55] text-white shadow-lg shadow-[#1f6b55]/20"><Building2 size={20} /></span>
          Aapka <span className="text-[#1f6b55]">PG</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#687066] transition hover:bg-[#f1eee6] hover:text-[#1f6b55]"><ArrowLeft size={15} /> Back to home</Link>
      </header>
      <main className="mx-auto flex max-w-7xl items-center justify-center px-5 pb-16 pt-6 lg:px-8 lg:pt-10">
        <div className={`grid w-full items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
          <div className="relative hidden min-h-[480px] overflow-hidden rounded-[30px] bg-[#1f6b55] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d47745]/40 blur-3xl" />
            <div className="relative">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9f0e2]"><Sparkles size={14} /> A better stay starts here</span>
              <h2 className="max-w-sm text-4xl font-bold leading-tight tracking-tight">Your space.<br /><span className="font-serif font-medium italic text-[#f5d6a8]">Your people.</span></h2>
              <p className="mt-5 max-w-sm leading-7 text-white/70">A simpler way to find, manage, and feel at home in your PG.</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl">
              <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=85" alt="Comfortable shared living room" className="h-48 w-full object-cover opacity-90" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-white/95 p-3 text-[#20251f]"><ShieldCheck size={18} className="text-[#1f6b55]" /><span className="text-xs font-semibold">Verified homes, happier residents</span></div>
            </div>
          </div>
          <div className="w-full">
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-[#20251f]">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-[#687066]">{subtitle}</p>}
            </div>
            <div className="rounded-[24px] border border-[#e9e5dc] bg-white p-6 shadow-xl shadow-[#314f3f]/[0.06] sm:p-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
