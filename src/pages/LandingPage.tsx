import { Link } from 'react-router-dom';
import { Building2, DoorOpen, Users, FileText, Receipt, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

const features = [
  { icon: DoorOpen, title: 'Rooms & beds', text: 'Add rooms, add or remove beds, and see exactly what is vacant at a glance.' },
  { icon: Users, title: 'Tenant accounts', text: 'Create a login for each tenant in seconds. No self sign-up, no OTPs — you stay in control.' },
  { icon: FileText, title: 'Document storage', text: 'Keep ID proofs, agreements and photos safely attached to the right tenant.' },
  { icon: Receipt, title: 'Expenses & invoices', text: 'Post expenses, share receipts, and keep clear billing records for every tenant.' },
  { icon: MessageSquare, title: 'Complaints', text: 'Tenants raise issues, your team tracks them to resolution.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Every PG is fully isolated. Tenants only ever see their own records.' },
];

const YEAR = new Date().getFullYear();

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-dark-900">
          <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><Building2 size={17} /></span> Aapka PG
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/find-pg" className="btn-ghost hidden sm:inline-flex">Find a PG</Link>
          <Link to="/app/login" className="btn-secondary">Log in</Link>
          <Link to="/register" className="btn-primary hidden sm:inline-flex">Register your PG</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 text-center">
        <span className="badge bg-primary-50 text-primary-700 mb-5">Simple PG & hostel management</span>
        <h1 className="text-4xl sm:text-5xl font-bold text-dark-900 tracking-tight max-w-3xl mx-auto leading-[1.1]">Run your PG without the spreadsheets</h1>
        <p className="mt-5 text-lg text-dark-500 max-w-2xl mx-auto">Manage rooms, beds, tenants and their documents from one clean dashboard — and give every tenant their own login.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary !px-6 !py-3">Get started free <ArrowRight size={16} /></Link>
          <Link to="/find-pg" className="btn-secondary !px-6 !py-3">Find a PG</Link>
        </div>
      </section>

      <section className="bg-background border-y border-dark-200">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="text-2xl font-bold text-dark-900 text-center mb-10 tracking-tight">Everything you need, nothing you don’t</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center mb-4"><Icon size={19} /></div>
                <h3 className="font-semibold text-dark-900">{title}</h3>
                <p className="text-sm text-dark-500 mt-1.5 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-5 py-8 text-sm text-dark-400 flex flex-wrap justify-between gap-2">
        <span>© {YEAR} Aapka PG</span>
        <span className="flex gap-4"><Link to="/find-pg" className="hover:text-dark-700">Find a PG</Link><Link to="/app/login" className="hover:text-dark-700">Log in</Link></span>
      </footer>
    </div>
  );
}
