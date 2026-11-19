import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, DoorOpen, Layers, LayoutGrid, Users, UserCog, FileText, Wallet, Receipt, UtensilsCrossed, MessageSquare,
  Download, Search, MapPin, Mail, ShieldCheck, ToggleRight, ArrowRight, Check, Phone, Bell,
} from 'lucide-react';

/* ----------------------------- content ----------------------------- */

const features = [
  { icon: DoorOpen, title: 'Rooms & beds', text: 'Add, edit and delete rooms and beds. Single, double, triple and larger sharing, with live occupancy.' },
  { icon: Layers, title: 'Bulk room creation', text: 'Generate a whole floor in one go, review every room, then save. Beds are created for you.' },
  { icon: LayoutGrid, title: 'Visual floor plan', text: 'See every bed as vacant, occupied, on notice or unavailable. Move tenants straight from the plan.' },
  { icon: Users, title: 'Tenant accounts', text: 'You create each tenant’s login. No public sign-up and no OTPs, so you stay in control.' },
  { icon: UserCog, title: 'Managers & permissions', text: 'Give staff their own login and choose exactly what they can manage. Enforced on the server.' },
  { icon: FileText, title: 'Documents', text: 'Store ID proofs, agreements and photos safely. Upload, view, download and delete with access checks.' },
  { icon: Wallet, title: 'Expenses', text: 'Post expenses with category, amount and receipts. Share with tenants and ask for proof when needed.' },
  { icon: Receipt, title: 'Billing & invoices', text: 'Create invoices for one tenant or everyone, track due and overdue, and mark them paid. A record, not a payment gateway.' },
  { icon: UtensilsCrossed, title: 'Food / mess menu', text: 'Plan the weekly menu by meal. Tenants see it, skip meals and rate what they eat.' },
  { icon: MessageSquare, title: 'Complaints', text: 'Tenants raise issues; your team tracks them from Submitted to Resolved, with escalation.' },
  { icon: Download, title: 'Export to CSV / Excel', text: 'Download tenants, rooms, occupancy, expenses and invoices whenever you need them.' },
  { icon: Search, title: 'Find PG listing', text: 'Be discovered by location, price and sharing. Prospects contact you by call, WhatsApp or enquiry.' },
  { icon: MapPin, title: 'Location on a map', text: 'Search or drop a pin for your PG. It powers distance search on Find PG.' },
  { icon: Mail, title: 'Email notifications', text: 'Owner emails for sign-up, new enquiries and new accounts, sent through Proton SMTP.' },
  { icon: ToggleRight, title: 'Feature switches', text: 'The platform admin allows modules per PG; owners switch them on or off. A disabled module is blocked everywhere.' },
  { icon: Bell, title: 'In-app notifications', text: 'Stay on top of complaints, new tenants, expenses and invoices as they happen.' },
];

const ownerSteps = [
  { n: 1, title: 'Register your PG', text: 'One short form: your details, PG name and location (search or drop a pin). No payment step.' },
  { n: 2, title: 'Add rooms & beds', text: 'Create rooms one by one, or use bulk add to generate a full floor. Review the list before saving.' },
  { n: 3, title: 'Create tenant accounts', text: 'Pick a vacant bed, enter the tenant’s details and rent. You get a mobile + password to hand over.' },
  { n: 4, title: 'Run the PG', text: 'Upload documents, post expenses, issue invoices, publish the food menu and handle complaints.' },
  { n: 5, title: 'Get found & report', text: 'List on Find PG to receive enquiries, and export your data to CSV or Excel any time.' },
];

const tenantSteps = [
  { n: 1, title: 'Get your login', text: 'Your PG owner creates your account and shares your mobile number and password.' },
  { n: 2, title: 'Sign in', text: 'Log in with your mobile and password, and change the password to your own.' },
  { n: 3, title: 'See your stay', text: 'Your room and bed, invoices, shared expenses, the food menu and your documents, all in one place.' },
  { n: 4, title: 'Stay in touch', text: 'Upload receipts when asked, raise complaints, opt out of meals and rate food.' },
];

const seekerSteps = [
  { n: 1, title: 'Search', text: 'Type an area or city, or tap “Near me” to search around your location.' },
  { n: 2, title: 'Filter', text: 'Narrow by gender, sharing type, monthly price, free beds and distance.' },
  { n: 3, title: 'Compare', text: 'Open a PG to see rent packages, room availability and its place on the map.' },
  { n: 4, title: 'Contact the owner', text: 'Call, WhatsApp, or send an enquiry. No brokerage and no account needed.' },
];

type RoleKey = 'owner' | 'manager' | 'tenant' | 'admin';
const roles: { key: RoleKey; label: string; icon: typeof Building2; blurb: string; can: string[] }[] = [
  {
    key: 'owner', label: 'PG owner', icon: Building2, blurb: 'Full control of your PG.',
    can: ['Manage rooms, beds and bulk creation', 'Create tenant and manager accounts', 'Post expenses and issue invoices', 'Manage food menu, documents and complaints', 'Choose which modules your PG uses', 'Receive and answer Find PG enquiries', 'Export data to CSV / Excel'],
  },
  {
    key: 'manager', label: 'Manager', icon: UserCog, blurb: 'Does what the owner allows, nothing more.',
    can: ['Manage tenants and their documents', 'Update the food menu', 'Handle complaints', 'Post expenses or invoices, if granted', 'Edit rooms and export data, if granted', 'Cannot create managers or change settings'],
  },
  {
    key: 'tenant', label: 'Tenant', icon: Users, blurb: 'Sees only their own information.',
    can: ['View room, bed and PG details', 'View their invoices and shared expenses', 'Upload receipts and proofs when requested', 'View the food menu, opt out of meals, rate food', 'Raise and track complaints', 'Cannot see other tenants’ private data'],
  },
  {
    key: 'admin', label: 'Platform admin', icon: ShieldCheck, blurb: 'Looks after the whole platform.',
    can: ['See every PG and its activity at a glance', 'Allow or block modules per PG', 'Suspend or reactivate a PG', 'Hide or list a PG on Find PG'],
  },
];

/* ----------------------------- pieces ----------------------------- */

function Steps({ steps }: { steps: { n: number; title: string; text: string }[] }) {
  return (
    <ol className="space-y-5">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-4">
          <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{s.n}</span>
          <div><h4 className="font-semibold text-dark-900"><span className="sr-only">Step {s.n}: </span>{s.title}</h4><p className="text-sm text-dark-500 mt-0.5 leading-relaxed">{s.text}</p></div>
        </li>
      ))}
    </ol>
  );
}

/** Decorative preview of the floor plan, built from the same colours the app uses. */
function PlanPreview() {
  const beds: { s: 'v' | 'o' | 'n' | 'u'; l: string }[][] = [
    [{ s: 'o', l: 'AK' }, { s: 'o', l: 'RV' }],
    [{ s: 'o', l: 'SP' }, { s: 'v', l: '' }, { s: 'v', l: '' }],
    [{ s: 'n', l: 'NJ' }, { s: 'u', l: '' }],
    [{ s: 'v', l: '' }, { s: 'o', l: 'KM' }, { s: 'o', l: 'DR' }, { s: 'v', l: '' }],
  ];
  const tone = { v: 'bg-success-light border-success/40 text-success', o: 'bg-primary-50 border-primary-200 text-primary-800', n: 'bg-warning-light border-warning/40 text-warning', u: 'bg-dark-100 border-dark-300 text-dark-400' };
  const names = { v: 'Vacant', o: '', n: 'Notice', u: 'Unavailable' };
  return (
    <div className="card p-5 shadow-glow" role="img" aria-label="Preview of the floor plan: rooms with vacant, occupied, notice and unavailable beds">
      <div className="flex items-center justify-between mb-4"><span className="text-sm font-semibold text-dark-900">Floor 1</span><span className="badge bg-success-light text-success">4 beds free</span></div>
      <div className="grid grid-cols-2 gap-3">
        {beds.map((room, i) => (
          <div key={i} className="rounded-lg border border-dark-200 p-2.5">
            <div className="text-[11px] font-semibold text-dark-500 mb-2">Room 10{i + 1}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {room.map((b, j) => (
                <div key={j} className={`rounded-md border-2 px-2 py-1.5 text-[11px] font-medium text-center ${tone[b.s]}`}>{b.l || names[b.s]}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[11px] text-dark-500">
        {(['v', 'o', 'n', 'u'] as const).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded border ${tone[k]}`} />{{ v: 'Vacant', o: 'Occupied', n: 'On notice', u: 'Unavailable' }[k]}</span>)}
      </div>
    </div>
  );
}

const YEAR = new Date().getFullYear();

/* ------------------------------ page ------------------------------ */

export default function LandingPage() {
  const [flow, setFlow] = useState<'owner' | 'tenant' | 'seeker'>('owner');
  const [role, setRole] = useState<RoleKey>('owner');
  const active = roles.find((r) => r.key === role)!;
  const flows = { owner: ownerSteps, tenant: tenantSteps, seeker: seekerSteps };
  const flowTabs = [{ k: 'owner', l: 'I own a PG' }, { k: 'tenant', l: 'I’m a tenant' }, { k: 'seeker', l: 'I’m looking for a PG' }] as const;

  return (
    <div className="min-h-screen bg-white text-dark-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-glow">Skip to content</a>

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-dark-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold"><span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><Building2 size={17} /></span> Aapka PG</Link>
          <nav aria-label="Sections" className="hidden md:flex items-center gap-1 text-sm font-medium text-dark-600">
            {[['#features', 'Features'], ['#how-it-works', 'How it works'], ['#roles', 'Roles'], ['#find-pg', 'Find PG']].map(([h, l]) => <a key={h} href={h} className="px-3 py-2 rounded-lg hover:bg-dark-100 hover:text-dark-900">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/app/login" className="btn-secondary">Log in</Link>
            <Link to="/register" className="btn-primary hidden sm:inline-flex">Register your PG</Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary-50/60 to-white">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="badge bg-primary-50 text-primary-700 mb-5">PG & hostel management, made simple</span>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">Run your PG without the spreadsheets</h1>
              <p className="mt-5 text-lg text-dark-500 max-w-xl">Rooms, beds, tenants, documents, expenses, invoices and the mess menu in one clean dashboard. Give every tenant their own login, and get found by people searching for a PG.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary !px-6 !py-3">Register your PG <ArrowRight size={16} /></Link>
                <Link to="/find-pg" className="btn-secondary !px-6 !py-3"><Search size={16} /> Find a PG</Link>
              </div>
              <ul className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-dark-600">
                {['No online payments to set up', 'Tenants log in with mobile + password', 'Permissions enforced on the server', 'Your data, exportable any time'].map((t) => <li key={t} className="flex items-center gap-2"><Check size={16} className="text-success shrink-0" /> {t}</li>)}
              </ul>
            </div>
            <PlanPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-dark-200 bg-background">
          <div className="max-w-6xl mx-auto px-5 py-16">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Everything your PG needs</h2>
              <p className="text-dark-500 mt-3">From the first room to the monthly report, every feature works together and is backed by your own data.</p>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="card p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center mb-3"><Icon size={19} aria-hidden="true" /></div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-dark-500 mt-1.5 leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 py-16">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Up and running in minutes</h2>
              <p className="text-dark-500 mt-3">A simple flow for everyone involved. Pick yours.</p>
            </div>
            <div className="flex justify-center mb-8">
              <div className="inline-flex flex-wrap justify-center rounded-lg bg-dark-100 p-1" role="tablist" aria-label="Choose your flow">
                {flowTabs.map(({ k, l }) => (
                  <button key={k} role="tab" id={`flow-tab-${k}`} aria-selected={flow === k} aria-controls="flow-panel" onClick={() => setFlow(k)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${flow === k ? 'bg-white text-dark-900 shadow-soft' : 'text-dark-500 hover:text-dark-800'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div id="flow-panel" role="tabpanel" aria-labelledby={`flow-tab-${flow}`} className="max-w-2xl mx-auto card p-6 sm:p-8">
              <Steps steps={flows[flow]} />
              <div className="mt-7 pt-6 border-t border-dark-200 flex flex-wrap gap-3">
                {flow === 'owner' && <Link to="/register" className="btn-primary">Register your PG <ArrowRight size={16} /></Link>}
                {flow === 'tenant' && <Link to="/app/login" className="btn-primary">Tenant log in <ArrowRight size={16} /></Link>}
                {flow === 'seeker' && <Link to="/find-pg" className="btn-primary">Start searching <ArrowRight size={16} /></Link>}
                {flow === 'tenant' && <span className="text-sm text-dark-500 self-center">Don’t have a login? Ask your PG owner.</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 border-y border-dark-200 bg-background">
          <div className="max-w-6xl mx-auto px-5 py-16">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-3xl font-bold tracking-tight">The right access for everyone</h2>
              <p className="text-dark-500 mt-3">Roles and permissions are checked by the server on every request, not just hidden in the interface.</p>
            </div>
            <div className="grid md:grid-cols-[240px_1fr] gap-6 max-w-4xl mx-auto">
              <div role="tablist" aria-label="Roles" aria-orientation="vertical" className="flex md:flex-col gap-2 overflow-x-auto">
                {roles.map(({ key, label, icon: Icon }) => (
                  <button key={key} role="tab" id={`role-tab-${key}`} aria-selected={role === key} aria-controls="role-panel" onClick={() => setRole(key)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-left whitespace-nowrap border transition ${role === key ? 'bg-white border-primary text-primary-700 shadow-soft' : 'border-dark-200 bg-white text-dark-600 hover:border-dark-300'}`}>
                    <Icon size={17} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
              <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${role}`} className="card p-6">
                <h3 className="text-xl font-bold">{active.label}</h3>
                <p className="text-dark-500 text-sm mt-1">{active.blurb}</p>
                <ul className="mt-5 space-y-2.5">
                  {active.can.map((c) => <li key={c} className="flex items-start gap-2.5 text-sm text-dark-700"><Check size={16} className="text-success mt-0.5 shrink-0" aria-hidden="true" /> {c}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Find PG */}
        <section id="find-pg" className="scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 py-16">
            <div className="card p-8 sm:p-10 grid lg:grid-cols-2 gap-8 items-center bg-primary-50/50">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Looking for a PG?</h2>
                <p className="text-dark-600 mt-3 leading-relaxed">Search by location, filter by price and sharing, and contact owners directly. See free beds, rent packages and the PG on a map before you visit.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/find-pg" className="btn-primary"><Search size={16} /> Find a PG</Link>
                  <Link to="/register" className="btn-secondary">List your PG</Link>
                </div>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3 text-sm">
                {[[MapPin, 'Search by area or near you'], [Search, 'Filter by gender, sharing and price'], [Phone, 'Call or WhatsApp the owner'], [Mail, 'Send an enquiry in seconds']].map(([Icon, t]) => {
                  const I = Icon as typeof MapPin;
                  return <li key={t as string} className="flex items-center gap-3 bg-white rounded-lg border border-dark-200 px-4 py-3"><I size={17} className="text-primary shrink-0" aria-hidden="true" /> {t as string}</li>;
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-dark-900 text-white">
          <div className="max-w-6xl mx-auto px-5 py-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Ready to run your PG the easy way?</h2>
            <p className="text-dark-300 mt-3 max-w-xl mx-auto">Register in a couple of minutes, add your rooms, and invite your tenants.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-primary !px-6 !py-3">Register your PG</Link>
              <Link to="/app/login" className="inline-flex items-center justify-center gap-2 rounded-lg border border-dark-600 px-6 py-3 text-sm font-semibold text-white hover:bg-dark-800 transition">Log in</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-dark-200">
        <div className="max-w-6xl mx-auto px-5 py-8 text-sm text-dark-500 flex flex-wrap justify-between gap-3">
          <span>© {YEAR} Aapka PG</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link to="/find-pg" className="hover:text-dark-800">Find a PG</Link>
            <Link to="/register" className="hover:text-dark-800">List your PG</Link>
            <Link to="/app/login" className="hover:text-dark-800">Log in</Link>
            <Link to="/admin/login" className="hover:text-dark-800">Admin</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
