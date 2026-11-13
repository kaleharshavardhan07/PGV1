import { useState } from 'react';
import {
  Wallet,
  Zap,
  MessageSquare,
  Users,
  TrendingUp,
  BedDouble,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CircleCheck,
  AtSign,
  Bell,
  BellRing,
  ChevronDown,
  Sparkles,
  Building2,
  CreditCard,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { PLANS, ANNUAL_DISCOUNT_PERCENT, FREE_TRIAL_DAYS } from '../data/plans';

const FAQS = [
  {
    q: 'Is Aapka PG available on a monthly subscription?',
    a: 'Yes. Aapka PG is a subscription-based platform. You pay monthly or annually for the plan that fits your PG, and you can cancel or change plans any time. All prices shown are editable sample prices until commercial pricing is finalized.',
  },
  {
    q: 'Can I change my subscription plan later?',
    a: 'Absolutely. You can upgrade instantly at any time, and downgrades are scheduled to take effect from your next renewal date so you never lose value you already paid for.',
  },
  {
    q: 'Do tenants need to pay separately for using the app?',
    a: 'No. Tenants use Aapka PG completely free. Only the PG owner pays for the subscription — tenants simply get rent payment, electricity bills, complaints and food menu features.',
  },
  {
    q: 'Will tenants automatically receive rent reminders?',
    a: 'Yes. The smart notification system sends reminders before the due date, on the due date and escalating overdue follow-ups — automatically, based on your configured schedule. Tenants can receive them in-app, and on Growth plan and above via WhatsApp, SMS or email.',
  },
  {
    q: 'Can I manage multiple PG branches?',
    a: 'The Pro plan supports multiple PG branches with a centralized dashboard and consolidated financial reporting. Starter and Growth plans cover a single location.',
  },
  {
    q: 'What happens when my subscription expires?',
    a: 'Nothing is deleted. Your tenant records, payment history and PG data remain safe. Paid automation features pause according to the subscription policy, and you can renew anytime from the Subscription & Billing page to restore full access.',
  },
  {
    q: 'Can I receive notifications through WhatsApp?',
    a: 'Yes — the Growth plan and above include WhatsApp notification integration through the WhatsApp Business API. In the current demo, WhatsApp, SMS and email deliveries are simulated and clearly labelled; real providers connect through the notification service layer.',
  },
  {
    q: 'Is a free trial available?',
    a: `Yes. Every plan includes a ${FREE_TRIAL_DAYS}-day free trial so you can test the full platform with your actual tenants before subscribing.`,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    pgName: '',
    rooms: '',
    beds: '',
    city: '',
    requirements: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 5000);
    setFormState({ name: '', email: '', phone: '', pgName: '', rooms: '', beds: '', city: '', requirements: '' });
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                A
              </div>
              <span className="text-2xl font-bold text-dark-900">Aapka PG</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#problems" className="text-dark-600 hover:text-primary font-medium">Problems</a>
              <a href="#features" className="text-dark-600 hover:text-primary font-medium">Features</a>
              <a href="#pricing" className="text-dark-600 hover:text-primary font-medium">Pricing</a>
              <a href="#how-it-works" className="text-dark-600 hover:text-primary font-medium">How It Works</a>
              <a href="#faq" className="text-dark-600 hover:text-primary font-medium">FAQ</a>
              <a href="#contact" className="text-dark-600 hover:text-primary font-medium">Contact</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <a href="/app/login" className="text-dark-900 font-medium hover:text-primary transition-colors">Login</a>
              <a href="/subscribe" className="btn-primary py-2.5 text-sm">
                Start Free Trial
              </a>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} className="text-dark-900" /> : <Menu size={24} className="text-dark-900" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100">
            <div className="px-4 py-4 space-y-3">
              <a href="#problems" onClick={() => setMobileMenuOpen(false)} className="block text-dark-600 py-2">Problems</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-dark-600 py-2">Features</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-dark-600 py-2">Pricing</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-dark-600 py-2">How It Works</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-dark-600 py-2">FAQ</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block text-dark-600 py-2">Contact</a>
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <a href="/app/login" className="text-center text-dark-900 py-2 font-medium">Login</a>
                <a href="/subscribe" className="text-center btn-primary py-2.5 text-sm">Start Free Trial</a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-b from-background-100 to-background-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary-50 text-primary text-sm font-semibold px-4 py-2 rounded-full">
                <Sparkles size={16} />
                The Smart Subscription-Based Operating System for PG &amp; Hostel Owners
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-dark-900 leading-tight">
                Managing Your PG <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Shouldn't Be This Difficult.</span>
              </h1>
              <p className="text-lg sm:text-xl text-dark-600 max-w-xl">
                Manage your PG, collect rent, track electricity bills, automate overdue reminders and
                monitor every room — all from one subscription-based platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#contact" className="inline-flex items-center justify-center gap-2 btn-primary">
                  Book a Free Demo <ArrowRight size={18} />
                </a>
                <a href="/app" className="inline-flex items-center justify-center gap-2 btn-secondary">
                  Explore the Application
                </a>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-100">
                <div>
                  <div className="text-2xl font-bold text-dark-900">1000+</div>
                  <div className="text-sm text-dark-500">PGs Digitized</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-900">50K+</div>
                  <div className="text-sm text-dark-500">Residents Served</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-900">98%</div>
                  <div className="text-sm text-dark-500">Satisfaction</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-2xl transform rotate-3" />
              <div className="relative bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100">
                <div className="bg-dark-900 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="p-6">
                  {/* Dashboard Mockup */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-primary-50 rounded-xl p-4">
                      <div className="text-xs text-dark-400 mb-1">Total Rent Received</div>
                      <div className="text-2xl font-bold text-dark-900">₹4.2L</div>
                      <div className="text-sm text-success mt-1">+12% this month</div>
                    </div>
                    <div className="bg-secondary-50 rounded-xl p-4">
                      <div className="text-xs text-dark-400 mb-1">Occupancy Rate</div>
                      <div className="text-2xl font-bold text-dark-900">94%</div>
                      <div className="text-sm text-success mt-1">3 beds vacant</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-600">Rent due this month</span>
                      <span className="font-medium text-dark-900">₹2.8L</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-success h-2 rounded-full" style={{ width: '75%' }} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-600">Outstanding</span>
                      <span className="font-medium text-warning">₹72K</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section id="problems" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">The Problems PG Owners Face</h2>
            <p className="text-dark-600 text-lg">
              Traditional PG management comes with manual paperwork, inconsistent rent collection,
              and opaque billing systems. Let's solve these together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-6 hover:shadow-glow transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <Wallet size={24} />
              </div>
              <h3 className="text-xl font-bold text-dark-900 mb-3">Rent Collection Problems</h3>
              <ul className="space-y-2 text-dark-600">
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Tenants delay payments
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Manual register maintenance
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Difficult to track outstanding rent
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Deposit records become confusing
                </li>
              </ul>
            </div>

            <div className="card p-6 hover:shadow-glow transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-dark-900 mb-3">Electricity Bill Problems</h3>
              <ul className="space-y-2 text-dark-600">
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Manual meter readings
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Calculator-based billing
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Disputes between roommates
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  No transparent electricity records
                </li>
              </ul>
            </div>

            <div className="card p-6 hover:shadow-glow transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <BedDouble size={24} />
              </div>
              <h3 className="text-xl font-bold text-dark-900 mb-3">Vacant Bed Problems</h3>
              <ul className="space-y-2 text-dark-600">
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Difficult to identify empty beds
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Potential tenants don't know availability
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  Empty beds cause lost revenue
                </li>
                <li className="flex items-start gap-2">
                  <CircleCheck size={16} className="mt-0.5 text-success" />
                  No centralized vacancy listing
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-background-200 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">One Platform. Complete PG Management.</h2>
            <p className="text-dark-600 text-lg">
              Aapka PG brings all your property operations into one unified dashboard.
              From tenant management to financial reporting - everything is just a click away.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary mx-auto mb-4 flex items-center justify-center">
                <Users size={32} />
              </div>
              <h3 className="font-bold text-dark-900 mb-2">Tenant Management</h3>
              <p className="text-sm text-dark-600">
                Complete tenant profiles, document storage, and easy allocation tracking.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary-50 text-secondary mx-auto mb-4 flex items-center justify-center">
                <Wallet size={32} />
              </div>
              <h3 className="font-bold text-dark-900 mb-2">Rent & Electricity</h3>
              <p className="text-sm text-dark-600">
                Automated billing, payment reminders, and transparent electricity calculations.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-bold text-dark-900 mb-2">Complaints & Food</h3>
              <p className="text-sm text-dark-600">
                Streamlined complaint tracking and weekly food menu management.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp size={32} />
              </div>
              <h3 className="font-bold text-dark-900 mb-2">Bed Availability</h3>
              <p className="text-sm text-dark-600">
                Real-time occupancy tracking with public vacancy sharing links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">

            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-100 rounded-2xl transform rotate-3" />
                  <div className="relative card p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900">Online Rent Payment</div>
                        <div className="text-xs text-dark-400">Seamless transactions</div>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-dark-600">
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>UPI, cards and net banking interface</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Rent due-date tracking</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Automatic payment reminders</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Download digital receipts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h3 className="text-2xl font-bold text-dark-900 mb-3">Online Rent Payment System</h3>
                <p className="text-dark-600 mb-4">
                  Say goodbye to cash collection. Aapka PG enables tenants to pay rent securely online
                  with automatic reminders and receipt generation. Track payments in real-time and
                  get notified about overdue amounts instantly.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-dark-900 mb-3">Smart Electricity Management</h3>
                <p className="text-dark-600 mb-4">
                  Measure, calculate, and distribute electricity bills fairly. Our system tracks
                  meter readings automatically and splits bills equally among roommates.
                </p>
                <div className="space-y-3 text-sm text-dark-600">
                  <div className="flex gap-3">
                    <CircleCheck size={16} className="text-success mt-0.5" />
                    <span>Room-wise meter reading</span>
                  </div>
                  <div className="flex gap-3">
                    <CircleCheck size={16} className="text-success mt-0.5" />
                    <span>Automatic unit calculation</span>
                  </div>
                  <div className="flex gap-3">
                    <CircleCheck size={16} className="text-success mt-0.5" />
                    <span>Configurable per-unit rate</span>
                  </div>
                  <div className="flex gap-3">
                    <CircleCheck size={16} className="text-success mt-0.5" />
                    <span>Equal electricity bill splitting</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="relative">
                  <div className="absolute inset-0 bg-secondary-100 rounded-2xl transform -rotate-3" />
                  <div className="relative card p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center">
                        <Zap size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900">Electricity Tracking</div>
                        <div className="text-xs text-dark-400">Transparent billing</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-600">Previous Reading</span>
                        <span className="font-medium">4186 units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-600">Current Reading</span>
                        <span className="font-medium">4400 units</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between">
                        <span className="text-dark-900 font-medium">Units Consumed</span>
                        <span className="font-bold">214 units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-600">Rate per unit</span>
                        <span className="font-medium">₹9</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-600">Total Room Bill</span>
                        <span className="font-bold text-primary">₹1,926</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-600">Occupants</span>
                        <span className="font-medium">2</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between text-base">
                        <span className="text-dark-900 font-medium">Your Share</span>
                        <span className="font-bold text-green-600">₹963</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-100 rounded-2xl transform rotate-3" />
                  <div className="relative card p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900">Complaint Management</div>
                        <div className="text-xs text-dark-400">Issue tracking</div>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-dark-600">
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Submit complaints with photos</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Complaint categories</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Track complaint status</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Manager notifications</span>
                      </div>
                      <div className="flex gap-3">
                        <CircleCheck size={16} className="text-success mt-0.5" />
                        <span>Resolution history</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h3 className="text-2xl font-bold text-dark-900 mb-3">Smart Complaint Management</h3>
                <p className="text-dark-600 mb-4">
                  Tenants can submit complaints with photos directly from their mobile app.
                  Managers receive instant notifications and can track resolution status.
                  Transparent communication keeps everyone informed.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-dark-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">
              Get your PG digitized in just 5 simple steps
            </p>
          </div>

          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -translate-y-1/2 hidden lg:block" />
            <div className="grid md:grid-cols-5 gap-6">
              {[
                { step: '1', title: 'Consultation', desc: 'We understand your PG requirements and specific needs' },
                { step: '2', title: 'Setup', desc: 'Configure rooms, beds, rates, and staff accounts' },
                { step: '3', title: 'Testing', desc: 'Test the application with actual tenants' },
                { step: '4', title: 'Training', desc: 'Train your PG manager on using the platform' },
                { step: '5', title: 'Go Live', desc: 'Share the application with tenants and start digitizing' }
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border-4 border-primary mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-center text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Measurable Benefits</h2>
            <p className="text-dark-600 text-lg">
              Transform your PG operations and see the difference in efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Reduce Paperwork', desc: 'Completely digitize tenant records, agreements, and billing', icon: '📄' },
              { title: 'Improve Rent Collection', desc: 'Online payments with automated reminders increase on-time payments', icon: '💰' },
              { title: 'Transparent Billing', desc: 'Electricity calculations that tenants can verify and trust', icon: '📊' },
              { title: 'Systematic Complaints', desc: 'Track issues from submission to resolution with history', icon: '📝' },
              { title: 'Find Vacant Beds Faster', desc: 'Public vacancy listings attract more potential tenants', icon: '🚪' },
              { title: 'Multi-Branch Mgmt', desc: 'Manage multiple PG properties from a single dashboard', icon: '🏢' }
            ].map((item, i) => (
              <div key={i} className="card p-6 hover:shadow-glow transition-shadow">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-dark-900 mb-2">{item.title}</h3>
                <p className="text-dark-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Simple Plans. Smarter PG Management.</h2>
            <p className="text-dark-600 text-lg">
              Choose a plan that fits your PG. Manage tenants, rent, electricity and complaints from one platform.
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!annualBilling ? 'text-dark-900' : 'text-dark-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              className={`relative w-14 h-8 rounded-full transition-colors ${annualBilling ? 'bg-primary' : 'bg-gray-300'}`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
                  annualBilling ? 'left-7' : 'left-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annualBilling ? 'text-dark-900' : 'text-dark-400'}`}>
              Annual
            </span>
            <span className="text-xs font-bold text-success bg-success-light px-2.5 py-1 rounded-full">
              Save {ANNUAL_DISCOUNT_PERCENT}%
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {PLANS.map((plan) => {
              const price = annualBilling
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;
              const isRecommended = plan.recommended;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-8 flex flex-col transition-shadow ${
                    isRecommended
                      ? 'bg-dark-900 text-white shadow-glow md:-my-4 md:py-12'
                      : 'card hover:shadow-glow'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                      Recommended
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-xl font-bold ${isRecommended ? 'text-white' : 'text-dark-900'}`}>
                      {plan.name.toUpperCase()}
                    </h3>
                  </div>
                  <p className={`text-sm mb-6 ${isRecommended ? 'text-gray-400' : 'text-dark-500'}`}>
                    {plan.tagline}
                  </p>
                  <div className="mb-1 flex items-end gap-1">
                    <span className={`text-4xl font-bold ${isRecommended ? 'text-white' : 'text-dark-900'}`}>
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className={`text-sm mb-1 ${isRecommended ? 'text-gray-400' : 'text-dark-500'}`}>/month</span>
                  </div>
                  <p className={`text-xs mb-6 ${isRecommended ? 'text-gray-400' : 'text-dark-400'}`}>
                    {annualBilling
                      ? `Billed annually (₹${plan.annualPrice.toLocaleString('en-IN')}/yr, ${ANNUAL_DISCOUNT_PERCENT}% off)`
                      : 'Billed monthly · cancel anytime'}
                  </p>
                  <ul className="space-y-3 text-sm flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CircleCheck size={16} className={`mt-0.5 ${isRecommended ? 'text-secondary' : 'text-success'}`} />
                        <span className={isRecommended ? 'text-gray-200' : 'text-dark-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={`text-xs mb-4 ${isRecommended ? 'text-gray-400' : 'text-dark-400'}`}>
                    Up to {plan.limits.rooms === null ? 'unlimited' : plan.limits.rooms} rooms ·{' '}
                    {plan.limits.beds === null ? 'unlimited' : plan.limits.beds} beds ·{' '}
                    {plan.limits.branches === null ? 'unlimited' : plan.limits.branches} location{plan.limits.branches === 1 ? '' : 's'}
                  </p>
                  {plan.id === 'pro' ? (
                    <a href="#contact" className={`w-full text-center py-3 rounded-xl font-semibold transition-colors ${isRecommended ? 'bg-white text-dark-900 hover:bg-gray-100' : 'btn-secondary'}`}>
                      Contact Sales
                    </a>
                  ) : (
                    <a
                      href={`/subscribe?plan=${plan.id}${plan.id === 'starter' ? '&trial=1' : ''}`}
                      className="w-full text-center py-3 rounded-xl font-semibold transition-colors bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                    >
                      {plan.id === 'starter' ? 'Start Free Trial' : 'Choose This Plan'}
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10 space-y-2">
            <p className="text-sm text-dark-500">
              Every plan includes a <strong>{FREE_TRIAL_DAYS}-day free trial</strong>. Upgrade or downgrade anytime.
            </p>
            <p className="text-xs text-dark-400">
              Sample pricing for demonstration — final commercial pricing will be announced. Payment gateway integration is simulated in this demo.
            </p>
          </div>
        </div>
      </section>

      {/* Automated Reminders */}
      <section id="reminders" className="py-20 bg-gradient-to-b from-background-200 to-background-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-50 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <BellRing size={16} />
                Smart Notification System
              </div>
              <h2 className="text-3xl font-bold text-dark-900 mb-4">
                Never Chase Rent Payments Manually Again.
              </h2>
              <p className="text-dark-600 text-lg mb-8">
                Aapka PG watches every due date for you and notifies tenants, your manager and you —
                automatically, at the right time, through the right channel.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Wallet, title: 'Automatic rent reminders', desc: '5 days before, 1 day before, on the due date and escalating overdue follow-ups.' },
                  { icon: Zap, title: 'Electricity bill due-date alerts', desc: 'Tenants are notified the moment a bill is published and reminded until it is paid.' },
                  { icon: Bell, title: 'Overdue payment notifications', desc: '1, 3 and 7-day overdue escalations stop instantly once payment is received.' },
                  { icon: Users, title: 'Manager and owner alerts', desc: 'Overdue summaries, complaint escalations and vacancy alerts for your team.' },
                  { icon: CircleCheck, title: 'Payment confirmation notifications', desc: 'Every successful payment instantly confirms to the tenant and records a receipt.' },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-dark-900">{item.title}</div>
                      <div className="text-sm text-dark-500">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Phone mockup with notification previews */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-[3rem] blur-2xl" />
                <div className="relative w-[320px] bg-dark-900 rounded-[3rem] p-3 shadow-card">
                  <div className="bg-white rounded-[2.4rem] overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-secondary px-5 py-4 text-white">
                      <div className="text-xs opacity-80">Aapka PG · Notifications</div>
                      <div className="font-bold text-lg">Shree Ganesh PG</div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
                          <Wallet size={13} /> Rent · Today
                        </div>
                        <p className="text-sm text-dark-700">
                          Hi Rahul, your monthly PG rent of ₹8,500 for Room 203 is due on 5 November. Please complete your payment through Aapka PG.
                        </p>
                      </div>
                      <div className="bg-success-light border border-success/20 rounded-2xl p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-success mb-1">
                          <MessageSquare size={13} /> WhatsApp · Simulated
                        </div>
                        <p className="text-sm text-dark-700">
                          Your electricity bill for Room 203 is ₹963. The payment due date is 10 November. Please pay through Aapka PG.
                        </p>
                      </div>
                      <div className="bg-warning-light border border-warning/20 rounded-2xl p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-warning mb-1">
                          <Bell size={13} /> Overdue Alert
                        </div>
                        <p className="text-sm text-dark-700">
                          Hi Rahul, your PG rent of ₹8,500 is overdue by 3 days. Please clear your outstanding payment as soon as possible.
                        </p>
                      </div>
                      <div className="bg-background-200 rounded-2xl p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-success mb-1">
                          <CircleCheck size={13} /> Payment Confirmed
                        </div>
                        <p className="text-sm text-dark-700">
                          Payment of ₹8,500 received via UPI. Reference: UPI/4821. Receipt available in the app.
                        </p>
                      </div>
                      <div className="text-center text-[11px] text-dark-400 pb-1">
                        Simulated notification preview · real WhatsApp/SMS/Email connect via the notification service
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Benefits */}
      <section id="subscription-benefits" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Why PG Owners Subscribe</h2>
            <p className="text-dark-600 text-lg">
              One affordable subscription replaces registers, spreadsheets, calculator bills and follow-up phone calls.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Building2, title: 'No Manual Registers', desc: 'Stop maintaining paper registers and scattered spreadsheets. Every tenant, bed and payment lives in one system.' },
              { icon: Wallet, title: 'All Payments In One Place', desc: 'Rent, deposits and electricity — track every rupee with complete payment history and receipts.' },
              { icon: Bell, title: 'Get Notified About Overdues', desc: 'The platform chases payments for you with automatic reminders and escalation alerts.' },
              { icon: Users, title: 'Manage Multiple Tenants Efficiently', desc: 'Onboard new tenants in minutes with documents, bed allocation and verification tracking.' },
              { icon: TrendingUp, title: 'Improve Financial Visibility', desc: 'See collections, outstanding amounts and occupancy trends at a glance, every month.' },
              { icon: Smartphone, title: 'Mobile & Desktop Access', desc: 'Manage your PG from anywhere — the full platform works on phones, tablets and desktops.' },
            ].map((item) => (
              <div key={item.title} className="card p-6 hover:shadow-glow transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary flex items-center justify-center mb-4">
                  <item.icon size={22} />
                </div>
                <h3 className="text-lg font-bold text-dark-900 mb-2">{item.title}</h3>
                <p className="text-dark-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/subscribe" className="inline-flex items-center gap-2 btn-primary">
              <CreditCard size={18} /> Start Your Free Trial
            </a>
            <div className="flex items-center gap-2 text-sm text-dark-500">
              <ShieldCheck size={16} className="text-success" />
              Cancel anytime · Your data is never deleted
            </div>
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Experience the Platform</h2>
            <p className="text-dark-600 text-lg">See how Aapka PG works for tenants, managers, and owners</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Tenant App', desc: 'Rent payment, bill tracking, complaint submission', color: 'from-primary to-secondary' },
              { title: 'Manager Dashboard', desc: 'Meter readings, complaints, tenant management', color: 'from-secondary to-green-500' },
              { title: 'Owner Analytics', desc: 'Financial reports, occupancy tracking, insights', color: 'from-green-500 to-blue-500' }
            ].map((item, i) => (
              <div key={i} className="group cursor-pointer">
                <div className={`relative rounded-2xl overflow-hidden ${item.color} aspect-[4/3] flex items-center justify-center`}>
                  <div className="text-white text-center">
                    <div className="text-6xl mb-2">📱</div>
                    <div className="font-bold text-2xl">{item.title}</div>
                    <div className="opacity-80">{item.desc}</div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-medium group-hover:bg-white group-hover:text-primary transition-colors">
                    Try Demo
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-dark-600 text-lg">Everything PG owners ask before subscribing.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="font-semibold text-dark-900">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-dark-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-dark-600 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-card p-8 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-dark-900 mb-3">Ready to Digitize Your PG?</h2>
              <p className="text-dark-600">Let's build a PG management solution according to your requirements.</p>
            </div>

            {formSubmitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-success-light text-success rounded-full flex items-center justify-center mx-auto mb-4">
                  <CircleCheck size={40} />
                </div>
                <h3 className="text-2xl font-bold text-dark-900 mb-2">Thank You!</h3>
                <p className="text-dark-600">We'll contact you shortly to discuss your PG management needs.</p>
                <button onClick={() => setFormSubmitted(false)} className="mt-6 text-primary font-medium hover:underline">
                  Submit another inquiry
              </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">PG / Hostel Name</label>
                    <input
                      required
                      type="text"
                      value={formState.pgName}
                      onChange={(e) => setFormState({ ...formState, pgName: e.target.value })}
                      className="input-field"
                      placeholder="e.g. Sunrise Residency"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Owner Name</label>
                    <input
                      required
                      type="text"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="input-field"
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Mobile Number</label>
                    <input
                      required
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="input-field"
                      placeholder="e.g. name@example.com"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Number of Rooms</label>
                    <input
                      required
                      type="number"
                      value={formState.rooms}
                      onChange={(e) => setFormState({ ...formState, rooms: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Number of Beds</label>
                    <input
                      required
                      type="number"
                      value={formState.beds}
                      onChange={(e) => setFormState({ ...formState, beds: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">City</label>
                  <input
                    required
                    type="text"
                    value={formState.city}
                    onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Bangalore"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Additional Requirements</label>
                  <textarea
                    rows={3}
                    value={formState.requirements}
                    onChange={(e) => setFormState({ ...formState, requirements: e.target.value })}
                    className="input-field"
                    placeholder="Any specific features you need..."
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-3.5 text-lg">
                  Request a Free Consultation
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-12 bg-dark-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white text-primary flex items-center justify-center font-bold text-lg">A</div>
                <span className="text-xl font-bold">Aapka PG</span>
              </div>
              <p className="text-gray-400 text-sm">
                The Smart Subscription-Based Operating System for PG and Hostel Owners.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone size={14} /> +91 91672 63576
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} /> pwscoding@gmail.com
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://pwscoding.co.in" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">
                    <span className="text-white">@pws.coding</span>
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <AtSign size={14} /> @pws.coding
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Address</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5" />
                  <span>PWS Coding,<br/>Digital Hub, Bangalore</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} PWS Coding. All rights reserved.
          </div>
        </div>
      </section>
    </div>
  );
}
