import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export default function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-dark-900">
          <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><Building2 size={17} /></span> Aapka PG
        </Link>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pb-12">
        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-dark-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-dark-500 mt-1.5">{subtitle}</p>}
          </div>
          <div className="card p-6 sm:p-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
