import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export default function PublicHeader() {
  return (
    <header className="bg-white border-b border-dark-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-dark-900"><span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><Building2 size={17} /></span> Aapka PG</Link>
        <nav className="flex items-center gap-2">
          <Link to="/find-pg" className="btn-ghost hidden sm:inline-flex">Find PG</Link>
          <Link to="/register" className="btn-ghost hidden sm:inline-flex">List your PG</Link>
          <Link to="/app/login" className="btn-secondary">Log in</Link>
        </nav>
      </div>
    </header>
  );
}
