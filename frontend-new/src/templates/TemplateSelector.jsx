import React from 'react';
import { Link } from 'react-router-dom';

const templates = [
  {
    id: '2',
    name: 'Ecovise Dark',
    subtitle: 'Original — Dark Green Glassmorphism',
    description: 'The base design. Deep black + luminous green. First half great, bottom half needs more color variety.',
    colors: ['#050505', '#00ff41', '#10b981'],
    tag: 'BASE',
  },
  {
    id: '2b',
    name: 'Ecovise Spectrum',
    subtitle: 'Green Hero + Multi-Color Sections',
    description: 'Keeps the green hero top, but bottom sections use blue for network, amber for fees, teal for accounts, purple for mining data.',
    colors: ['#050505', '#00ff41', '#3b82f6'],
    tag: 'ALT',
  },
  {
    id: '2c',
    name: 'Ecovise Ice',
    subtitle: 'Dark Green + Cyan/Blue Cool Tones',
    description: 'Green primary accents shift to cyan and ice-blue for data sections. Cool temperature palette. White text for readability.',
    colors: ['#050505', '#00ff41', '#22d3ee'],
    tag: 'ALT',
  },
  {
    id: '2d',
    name: 'Ecovise Gold',
    subtitle: 'Dark Green + Gold/Amber Accents',
    description: 'Green for pool health, gold/amber for financial data, white for text. Premium finance meets crypto. Two-tone accent system.',
    colors: ['#050505', '#00ff41', '#f59e0b'],
    tag: 'ALT',
  },
  {
    id: '2e',
    name: 'Ecovise Mono',
    subtitle: 'Green Hero + White/Gray Body',
    description: 'Hero stats stay green. Everything else is clean white-on-dark with minimal color. Green only for key positive metrics.',
    colors: ['#050505', '#00ff41', '#e5e7eb'],
    tag: 'ALT',
  },
  {
    id: '2f',
    name: 'Ecovise Neon',
    subtitle: 'Green + Pink/Magenta Split',
    description: 'Pool stats green, network/external data in magenta/pink. Cyberpunk dual-tone. Bold contrast between internal and external data.',
    colors: ['#050505', '#00ff41', '#ec4899'],
    tag: 'ALT',
  },
  {
    id: '11',
    name: 'Void',
    subtitle: 'Black + White Mono + Cyan Accents',
    description: 'Pure black. White monospace text. Only hashrate, ETI amounts, and prices get cyan color. Maximum minimalism.',
    colors: ['#000000', '#ffffff', '#06b6d4'],
    tag: 'NEW',
  },
  {
    id: '12',
    name: 'Typewriter',
    subtitle: 'Black + White Serif + Orange Keys',
    description: 'Elegant dark with white text in clean mono. Key metrics pop in warm orange. Like a financial terminal reimagined.',
    colors: ['#0a0a0a', '#f0f0f0', '#f97316'],
    tag: 'NEW',
  },
  {
    id: '13',
    name: 'Slate',
    subtitle: 'Charcoal + White + Blue/Teal Metrics',
    description: 'Dark charcoal, white labels, blue for hashrate/blocks, teal for ETI amounts. Institutional, no glow, pure information.',
    colors: ['#111111', '#ffffff', '#2563eb'],
    tag: 'NEW',
  },
  {
    id: '14',
    name: 'Inkwell',
    subtitle: 'Black + Light Gray + Green/Red Dual',
    description: 'Black canvas, light gray text. Green for positive (balances, hashrate), red for costs (fees, gas). Semantic color only.',
    colors: ['#080808', '#d4d4d4', '#22c55e'],
    tag: 'NEW',
  },
  {
    id: '15',
    name: 'Axiom',
    subtitle: 'Black + White Headers + Violet Metrics',
    description: 'Near-black with crisp white section headers. Key numbers in soft violet/indigo. Futuristic but restrained.',
    colors: ['#0a0a0a', '#ffffff', '#8b5cf6'],
    tag: 'NEW',
  },
  {
    id: 'vig',
    name: 'VIG',
    subtitle: 'VIG Reference — IBM Plex Mono + Bordered Nav',
    description: 'Faithful reproduction of VIG design: IBM Plex Mono, generous px-16 padding, bordered nav buttons with white fill-on-active, Plus (+) decorative elements, thin opacity dividers, spacious card layouts.',
    colors: ['#000000', '#ffffff', '#06b6d4'],
    tag: 'REF',
  },
];

const overviewDesigns = [
  {
    id: 'overview-a',
    name: 'Terminal Green',
    subtitle: 'Classic Terminal — Green on Black',
    description: 'Pure black background, green accents, minimal terminal aesthetic. Data-dense, monospace, hacker feel.',
    colors: ['#000000', '#22c55e', '#06b6d4'],
    tag: 'OVR',
  },
  {
    id: 'overview-b',
    name: 'Slate Minimal',
    subtitle: 'Charcoal + Blue — Bloomberg Style',
    description: 'Charcoal background, VIG-style bordered buttons (touching, white fill on active), blue accents. Professional, institutional.',
    colors: ['#111111', '#ffffff', '#2563eb'],
    tag: 'OVR',
  },
  {
    id: 'overview-c',
    name: 'Glassmorphism',
    subtitle: 'Glass Cards + Emerald Glow',
    description: 'Black with glass cards (backdrop-blur, semi-transparent). Emerald gradient borders, green glow on values. Premium crypto aesthetic.',
    colors: ['#000000', '#00ff41', '#10b981'],
    tag: 'OVR',
  },
  {
    id: 'overview-d',
    name: 'Inkwell Pro',
    subtitle: 'Financial Dashboard — Green/Red Semantic',
    description: 'Deep black, bordered cards, semantic coloring: green for earnings, red for costs. Professional financial terminal.',
    colors: ['#080808', '#22c55e', '#ef4444'],
    tag: 'OVR',
  },
  {
    id: 'overview-e',
    name: 'Neon Grid',
    subtitle: 'Cyberpunk Grid + Neon Green Glow',
    description: 'Subtle CSS grid background, neon green glowing values, emerald accents. Cyberpunk/Matrix inspired.',
    colors: ['#050505', '#00ff41', '#10b981'],
    tag: 'OVR',
  },
  {
    id: 'overview-12',
    name: 'Typewriter Overview',
    subtitle: 'Template 12 — Orange Keys + Tabs',
    description: 'Template 12 Typewriter design adapted for Overview page. Fira Code mono, orange section titles, rounded cards, VIG-style tab navigation.',
    colors: ['#0a0a0a', '#f0f0f0', '#f97316'],
    tag: 'OVR',
  },
  {
    id: 'overview-selector',
    name: 'Selector Style',
    subtitle: 'Template Index — Gradient Cards + Emerald Pills',
    description: 'Based on the template selector page design. Gradient-topped cards, colored tags, emerald pill tabs, centered layout. Clean and modern.',
    colors: ['#050505', '#34d399', '#06b6d4'],
    tag: 'OVR',
  },
];

function TemplateCard({ t }) {
  return (
    <Link
      to={`/templates/${t.id}`}
      className="group block rounded-lg border border-gray-800/60 hover:border-gray-600 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${t.colors[0]} 0%, #0d0d0d 100%)` }}
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${t.colors[1]}, ${t.colors[2]})` }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            t.tag === 'OVR' ? 'text-orange-400 border-orange-900' : t.tag === 'REF' ? 'text-cyan-400 border-cyan-900' : t.tag === 'NEW' ? 'text-gray-300 border-gray-700' : t.tag === 'ALT' ? 'text-emerald-400 border-emerald-900' : 'text-amber-400 border-amber-900'
          }`}>
            {t.tag}
          </span>
          <div className="flex gap-1.5">
            {t.colors.map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-full border border-gray-700" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <h2 className="text-base font-bold text-white mb-0.5">{t.name}</h2>
        <p className="text-xs font-mono mb-2" style={{ color: t.colors[2] }}>{t.subtitle}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
      </div>
    </Link>
  );
}

export default function TemplateSelector() {
  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/images/eti-logo.png" alt="ETI" className="w-10 h-10" />
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
              ETICA <span className="text-emerald-400">POOL</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-1">Design Exploration — Dashboards + Overview Pages</p>
          <p className="text-gray-600 text-sm font-mono">11 dashboard variants + 7 overview page designs</p>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-mono text-orange-400 uppercase tracking-widest mb-4 px-1">Overview Page Designs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {overviewDesigns.map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-mono text-emerald-500 uppercase tracking-widest mb-4 px-1">Ecovise Family</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.filter(t => t.tag === 'BASE' || t.tag === 'ALT').map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </div>

        <div className="mt-12 mb-8">
          <h2 className="text-sm font-mono text-cyan-500 uppercase tracking-widest mb-4 px-1">Reference Design</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.filter(t => t.tag === 'REF').map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </div>

        <div className="mt-12 mb-8">
          <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4 px-1">New Minimalist Designs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.filter(t => t.tag === 'NEW').map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </div>

        <div className="text-center mt-12 text-gray-700 text-xs font-mono">
          ETI &middot; RandomX PoW &middot; Science knows no country because knowledge belongs to Humanity
        </div>
      </div>
    </div>
  );
}
