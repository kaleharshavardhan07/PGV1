import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e9e5dc] bg-[#fffdf9]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f6b55] text-white shadow-lg shadow-[#1f6b55]/20"><Building2 size={20} /></span>
          Aapka <span className="text-[#1f6b55]">PG</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/" className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#687066] transition hover:bg-[#f1eee6] hover:text-[#1f6b55] sm:inline-flex">Home</Link>
          <Link to="/register" className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#687066] transition hover:bg-[#f1eee6] hover:text-[#1f6b55] sm:inline-flex">List your PG</Link>
          <Link to="/app/login" className="rounded-full bg-[#1f6b55] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#1f6b55]/15 transition hover:bg-[#175541]">Log in</Link>
        </nav>
      </div>
    </header>
  );
}
