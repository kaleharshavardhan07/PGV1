import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BedDouble, Building2, ChevronDown, Heart, Menu, ShieldCheck,
  Sparkles, Star, Users, X,
} from 'lucide-react';

type Language = 'en' | 'hi' | 'mr';
type Copy = {
  navFind: string; navList: string; navLogin: string; heroEyebrow: string; heroTitle: string;
  heroAccent: string; heroText: string; findButton: string; listButton: string; trusted: string;
  browse: string; browseText: string; all: string; student: string; working: string; women: string;
  featured: string; featuredText: string; viewAll: string; perMonth: string; available: string;
  verified: string; why: string; whyText: string; safe: string; safeText: string; simple: string;
  simpleText: string; support: string; supportText: string; owners: string; ownersText: string;
  listCta: string; listCtaText: string; listCtaButton: string; footerText: string;
};

const copy: Record<Language, Copy> = {
  en: {
    navFind: 'Find a PG', navList: 'List your PG', navLogin: 'Log in', heroEyebrow: 'A better place to call home',
    heroTitle: 'Find a PG that feels', heroAccent: 'just right.', heroText: 'Comfortable rooms, verified homes, and a community that feels like yours. Search your next stay with Aapka PG.',
    findButton: 'Find my PG', listButton: 'List your property', trusted: 'Trusted by 2,500+ residents across India',
    browse: 'Browse by lifestyle', browseText: 'Your perfect stay is closer than you think.', all: 'All stays', student: 'Student friendly', working: 'Working professionals', women: 'Women only',
    featured: 'Handpicked stays for you', featuredText: 'Explore well-managed PGs in the cities you love.', viewAll: 'View all PGs', perMonth: '/ month', available: 'beds available', verified: 'Verified property',
    why: 'Everything you need for a happier stay', whyText: 'From finding your room to feeling at home, we make the entire journey simple.',
    safe: 'Safe & verified', safeText: 'Every property is reviewed so you can move in with confidence.',
    simple: 'Simple living', simpleText: 'Clear pricing, thoughtful amenities, and no unnecessary surprises.',
    support: 'Always supported', supportText: 'Reach your owner and our team whenever you need a hand.',
    owners: 'Own a PG?', ownersText: 'Fill your rooms faster and manage your property with less effort.', listCta: 'Put your property in the right hands.',
    listCtaText: 'Join thousands of owners using Aapka PG to welcome better tenants and run their PG smoothly.',
    listCtaButton: 'List your PG for free', footerText: 'A simpler way to find and manage your perfect PG.',
  },
  hi: {
    navFind: 'PG खोजें', navList: 'अपना PG जोड़ें', navLogin: 'लॉग इन', heroEyebrow: 'घर जैसा आराम, अब और आसान',
    heroTitle: 'अपना मनपसंद PG', heroAccent: 'आज ही खोजें।', heroText: 'सुविधाजनक कमरे, सत्यापित घर और अपनेपन से भरा समुदाय। Aapka PG के साथ अपनी अगली जगह खोजें।',
    findButton: 'PG खोजें', listButton: 'अपनी प्रॉपर्टी जोड़ें', trusted: 'पूरे भारत में 2,500+ निवासियों का भरोसा',
    browse: 'अपनी जीवनशैली चुनें', browseText: 'आपका सही ठिकाना आपके करीब है।', all: 'सभी PG', student: 'छात्रों के लिए', working: 'कामकाजी लोगों के लिए', women: 'केवल महिलाओं के लिए',
    featured: 'आपके लिए चुनिंदा PG', featuredText: 'अपनी पसंद के शहरों में बेहतरीन PG देखें।', viewAll: 'सभी PG देखें', perMonth: '/ महीना', available: 'बेड उपलब्ध', verified: 'सत्यापित प्रॉपर्टी',
    why: 'सुखद रहने के लिए सब कुछ', whyText: 'कमरा ढूंढने से लेकर घर जैसा महसूस करने तक, हम हर कदम आसान बनाते हैं।',
    safe: 'सुरक्षित और सत्यापित', safeText: 'हर प्रॉपर्टी की जांच की जाती है ताकि आप निश्चिंत होकर रहें।',
    simple: 'आसान जीवन', simpleText: 'पारदर्शी कीमतें, जरूरी सुविधाएं और कोई छिपे हुए सरप्राइज नहीं।',
    support: 'हमेशा सहायता', supportText: 'जरूरत पड़ने पर मालिक और हमारी टीम से तुरंत संपर्क करें।',
    owners: 'क्या आप PG के मालिक हैं?', ownersText: 'कम मेहनत में कमरे भरें और अपनी प्रॉपर्टी संभालें।', listCta: 'अपनी प्रॉपर्टी सही लोगों तक पहुंचाएं।',
    listCtaText: 'हजारों मालिकों के साथ जुड़ें और बेहतर किरायेदारों का स्वागत करें।', listCtaButton: 'मुफ्त में PG जोड़ें', footerText: 'सही PG खोजने और संभालने का आसान तरीका।',
  },
  mr: {
    navFind: 'PG शोधा', navList: 'तुमचे PG जोडा', navLogin: 'लॉग इन', heroEyebrow: 'घरासारखा आराम, आता सोपा',
    heroTitle: 'तुमचे योग्य PG', heroAccent: 'आजच शोधा.', heroText: 'आरामदायी खोल्या, पडताळलेली घरे आणि आपलेपणाने भरलेला समुदाय. Aapka PG सोबत तुमचे पुढचे घर शोधा.',
    findButton: 'PG शोधा', listButton: 'तुमची प्रॉपर्टी जोडा', trusted: 'संपूर्ण भारतातील 2,500+ रहिवाशांचा विश्वास',
    browse: 'तुमची जीवनशैली निवडा', browseText: 'तुमचे योग्य ठिकाण तुमच्या जवळच आहे.', all: 'सर्व PG', student: 'विद्यार्थ्यांसाठी', working: 'नोकरी करणाऱ्यांसाठी', women: 'फक्त महिलांसाठी',
    featured: 'तुमच्यासाठी निवडक PG', featuredText: 'तुमच्या आवडत्या शहरांमधील उत्तम PG पाहा.', viewAll: 'सर्व PG पाहा', perMonth: '/ महिना', available: 'बेड उपलब्ध', verified: 'पडताळलेली प्रॉपर्टी',
    why: 'आनंदी राहण्यासाठी आवश्यक सर्व काही', whyText: 'खोली शोधण्यापासून घरासारखे वाटेपर्यंतचा संपूर्ण प्रवास आम्ही सोपा करतो.',
    safe: 'सुरक्षित आणि पडताळलेले', safeText: 'प्रत्येक प्रॉपर्टीची तपासणी केली जाते, त्यामुळे निर्धास्त रहा.',
    simple: 'सोपे जीवन', simpleText: 'पारदर्शक किंमती, उपयुक्त सुविधा आणि कोणतेही लपलेले आश्चर्य नाही.',
    support: 'नेहमी मदतीला', supportText: 'गरज पडल्यास मालक आणि आमच्या टीमशी लगेच संपर्क साधा.',
    owners: 'तुमचे PG आहे?', ownersText: 'कमी प्रयत्नात खोल्या भरा आणि प्रॉपर्टी व्यवस्थापित करा.', listCta: 'तुमची प्रॉपर्टी योग्य लोकांपर्यंत पोहोचवा.',
    listCtaText: 'हजारो मालकांसोबत सामील व्हा आणि उत्तम भाडेकरूंचे स्वागत करा.', listCtaButton: 'मोफत PG जोडा', footerText: 'योग्य PG शोधण्याचा आणि व्यवस्थापित करण्याचा सोपा मार्ग.',
  },
};

const properties = [
  { name: 'The Courtyard House', city: 'Koramangala, Bengaluru', price: '₹12,500', beds: 3, rating: '4.9', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=85', tag: 'Popular' },
  { name: 'Casa Urbana', city: 'Hinjewadi, Pune', price: '₹9,800', beds: 5, rating: '4.8', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85', tag: 'New' },
  { name: 'The Olive Rooms', city: 'Indiranagar, Bengaluru', price: '₹15,200', beds: 2, rating: '4.9', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85', tag: 'Top rated' },
];
const YEAR = new Date().getFullYear();

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<'all' | 'student' | 'working' | 'women'>('all');
  const t = copy[language];
  const categories = [
    { key: 'all' as const, label: t.all, icon: Building2 },
    { key: 'student' as const, label: t.student, icon: BedDouble },
    { key: 'working' as const, label: t.working, icon: Users },
    { key: 'women' as const, label: t.women, icon: Sparkles },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#fffdf9] text-[#20251f]">
      <header className="sticky top-0 z-40 border-b border-[#e9e5dc] bg-[#fffdf9]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f6b55] text-white shadow-lg shadow-[#1f6b55]/20"><Building2 size={20} /></span>
            Aapka <span className="text-[#1f6b55]">PG</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#687066] md:flex">
            <a href="#stays" className="transition hover:text-[#1f6b55]">{t.navFind}</a>
            <a href="#why" className="transition hover:text-[#1f6b55]">Why Aapka PG</a>
            <a href="#owners" className="transition hover:text-[#1f6b55]">{t.owners}</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <label className="relative">
              <span className="sr-only">Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="appearance-none rounded-full border border-[#dedbd2] bg-transparent py-2 pl-3 pr-8 text-sm font-medium outline-none">
                <option value="en">English</option><option value="hi">हिंदी</option><option value="mr">मराठी</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-2.5 text-[#687066]" />
            </label>
            <Link to="/app/login" className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#334238] transition hover:bg-[#f1eee6]">{t.navLogin}</Link>
            <Link to="/register" className="rounded-full bg-[#1f6b55] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#1f6b55]/15 transition hover:-translate-y-0.5 hover:bg-[#175541]">{t.navList}</Link>
          </div>
          <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 md:hidden">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="border-t border-[#e9e5dc] bg-[#fffdf9] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-semibold">
            <a href="#stays" onClick={() => setMenuOpen(false)}>{t.navFind}</a><a href="#why" onClick={() => setMenuOpen(false)}>Why Aapka PG</a>
            <div className="flex items-center gap-3 pt-2"><select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="rounded-lg border border-[#dedbd2] bg-transparent px-2 py-2 text-sm"><option value="en">English</option><option value="hi">हिंदी</option><option value="mr">मराठी</option></select><Link to="/app/login" className="text-[#1f6b55]">{t.navLogin}</Link><Link to="/register" className="rounded-full bg-[#1f6b55] px-4 py-2 text-white">{t.navList}</Link></div>
          </div>
        </div>}
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e6f2ec] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.13em] text-[#1f6b55]"><Sparkles size={14} /> {t.heroEyebrow}</div>
              <h1 className="max-w-xl text-5xl font-bold leading-[1.05] tracking-[-0.045em] text-[#20251f] sm:text-6xl lg:text-[70px]">{t.heroTitle}<br /><span className="font-serif font-medium italic text-[#d47745]">{t.heroAccent}</span></h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-[#687066]">{t.heroText}</p>
              <div className="mt-9 flex flex-wrap gap-3"><Link to="/find-pg" className="inline-flex items-center gap-2 rounded-full bg-[#1f6b55] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#1f6b55]/20 transition hover:-translate-y-0.5 hover:bg-[#175541]">{t.findButton}<ArrowRight size={17} /></Link><Link to="/register" className="inline-flex items-center gap-2 rounded-full border border-[#d9d6cd] bg-white px-6 py-3.5 text-sm font-bold text-[#334238] transition hover:border-[#1f6b55]">{t.listButton}</Link></div>
              <div className="mt-9 flex items-center gap-3 text-sm text-[#687066]"><div className="flex -space-x-2">{['photo-1494790108377-be9c29b29330', 'photo-1500648767791-00dcc994a43e', 'photo-1534528741775-53994a69daeb'].map((id) => <img key={id} src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80`} alt="" className="h-8 w-8 rounded-full border-2 border-[#fffdf9] object-cover" />)}</div><span>{t.trusted}</span></div>
            </div>
            <div className="relative">
              <div className="absolute -right-6 -top-8 h-40 w-40 rounded-full bg-[#f5d6a8]/50 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] rounded-br-[100px] bg-[#dce9df] p-3 shadow-2xl shadow-[#314f3f]/15"><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88" alt="Bright, comfortable PG living room" className="h-[420px] w-full rounded-[25px] object-cover sm:h-[500px]" /><div className="absolute bottom-8 left-8 flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-xl backdrop-blur"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f2ec] text-[#1f6b55]"><ShieldCheck size={22} /></div><div><p className="text-xs text-[#687066]">{t.verified}</p><p className="font-bold">100% checked homes</p></div></div></div>
              <div className="absolute -bottom-5 -right-4 rounded-2xl bg-[#d47745] px-5 py-4 text-white shadow-xl sm:right-6"><p className="text-2xl font-bold">4.9 <span className="text-base">★</span></p><p className="text-xs text-white/80">resident rating</p></div>
            </div>
          </div>
        </section>

        <section id="stays" className="border-y border-[#e9e5dc] bg-[#f7f5ef] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-[#d47745]">{t.browse}</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.browseText}</h2></div><Link to="/find-pg" className="hidden items-center gap-2 text-sm font-bold text-[#1f6b55] sm:flex">{t.viewAll}<ArrowRight size={16} /></Link></div>
            <div className="mb-12 flex gap-2 overflow-x-auto pb-2">{categories.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setCategory(key)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${category === key ? 'bg-[#1f6b55] text-white shadow-lg shadow-[#1f6b55]/15' : 'bg-white text-[#687066] hover:text-[#1f6b55]'}`}><Icon size={16} />{label}</button>)}</div>
            <div className="grid gap-6 md:grid-cols-3">{properties.map((property) => <article key={property.name} className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="relative overflow-hidden"><img src={property.image} alt={property.name} className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#334238]">{property.tag}</span><button type="button" aria-label={`Save ${property.name}`} className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-[#687066] transition hover:text-[#d47745]"><Heart size={17} /></button></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{property.name}</h3><p className="mt-1 text-sm text-[#687066]">{property.city}</p></div><span className="flex items-center gap-1 text-sm font-bold text-[#d47745]"><Star size={14} fill="currentColor" /> {property.rating}</span></div><div className="mt-5 flex items-center justify-between border-t border-[#eeeae2] pt-4"><p className="font-bold text-[#1f6b55]">{property.price}<span className="text-xs font-normal text-[#687066]"> {t.perMonth}</span></p><span className="text-xs text-[#687066]">{property.beds} {t.available}</span></div></div></article>)}</div>
          </div>
        </section>

        <section id="why" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-[#d47745]">Aapka PG difference</p><h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">{t.why}</h2><p className="mt-5 max-w-md leading-7 text-[#687066]">{t.whyText}</p></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#e6f2ec] p-6"><ShieldCheck className="mb-8 text-[#1f6b55]" size={28} /><h3 className="font-bold">{t.safe}</h3><p className="mt-2 text-sm leading-6 text-[#687066]">{t.safeText}</p></div><div className="rounded-2xl bg-[#fff1e5] p-6"><BedDouble className="mb-8 text-[#d47745]" size={28} /><h3 className="font-bold">{t.simple}</h3><p className="mt-2 text-sm leading-6 text-[#687066]">{t.simpleText}</p></div><div className="rounded-2xl bg-[#f0ecfa] p-6"><Users className="mb-8 text-[#7657aa]" size={28} /><h3 className="font-bold">{t.support}</h3><p className="mt-2 text-sm leading-6 text-[#687066]">{t.supportText}</p></div></div></div></section>

        <section id="owners" className="mx-5 mb-20 overflow-hidden rounded-[28px] bg-[#1f6b55] lg:mx-auto lg:max-w-7xl"><div className="grid items-center lg:grid-cols-[1fr_0.8fr]"><div className="p-8 text-white sm:p-14"><p className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-[#b8dbc9]">{t.owners}</p><h2 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">{t.listCta}</h2><p className="mt-5 max-w-lg leading-7 text-white/75">{t.listCtaText}</p><Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#1f6b55] transition hover:bg-[#f5d6a8]">{t.listCtaButton}<ArrowRight size={17} /></Link></div><img src="https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1000&q=85" alt="Well-managed PG common area" className="h-72 w-full object-cover lg:h-full lg:min-h-[380px]" /></div></section>
      </main>

      <footer className="border-t border-[#e9e5dc] bg-[#f7f5ef]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-[#687066] lg:px-8"><Link to="/" className="flex items-center gap-2 font-bold text-[#20251f]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f6b55] text-white"><Building2 size={16} /></span>Aapka PG</Link><p>{t.footerText}</p><p>© {YEAR} Aapka PG</p></div></footer>
    </div>
  );
}
