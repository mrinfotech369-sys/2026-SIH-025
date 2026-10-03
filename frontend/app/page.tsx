'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Scale, Landmark, FileSearch, ArrowRight, Bot, FlaskConical, Search, BookOpen, Shield } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/lib/providers';
import { Navbar } from '@/components/nyaya/Navbar';
import { CitationChip } from '@/components/nyaya/ui';
import clsx from 'clsx';

const HOW_IT_WORKS = [
  { icon: Search, title: 'Retrieve', desc: 'Hybrid search across authenticated legal and scientific sources.' },
  { icon: ShieldCheck, title: 'Verify', desc: 'Every claim is semantically checked against retrieved text.' },
  { icon: BookOpen, title: 'Cite', desc: 'Answers include exact paragraph-level inline citations.' },
  { icon: Shield, title: 'Abstain', desc: 'If sources are missing or conflicting, we safely say so.' }
];

export default function Landing() {
  const { user } = useApp();

  return (
    <div className="min-h-screen bg-pagebg text-text-main flex flex-col" id="main-content">
      
      <Navbar items={[
        { href: '#features', label: 'Features' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '/app/reports', label: 'Trust Dashboard' },
        { href: '#about', label: 'About' }
      ]} />

      <main className="flex-1 w-full flex flex-col">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden w-full flex flex-col items-center justify-center pt-24 pb-32 px-6 bg-gradient-to-br from-white via-[#F4F6FF] to-[#E8ECFA] text-text-main">
          {/* Subtle Rotating Chakra Pattern Background */}
          <div className="absolute inset-0 pointer-events-none opacity-50 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
              className="w-[1200px] h-[1200px] border-[1px] border-brand-navy/[0.04] rounded-full flex items-center justify-center"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-1/2 h-[1px] bg-brand-navy/[0.04] origin-left left-1/2"
                  style={{ transform: `rotate(${i * 15}deg)` }}
                />
              ))}
            </motion.div>
          </div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-shakti/10 rounded-full blur-[100px]"></div>

          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-surface-border bg-white shadow-sm text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-verified" /> 
                <span className="text-brand-navy">Smart India Hackathon Prototype</span>
              </div>
              <h1 className="font-heading font-bold text-5xl md:text-7xl leading-[1.1] mb-6 text-brand-navy">
                Law, Backed <br/>
                <span className="text-brand-navy text-transparent bg-clip-text bg-gradient-to-r from-shakti to-shaktiHover">by Proof.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-lg leading-relaxed">
                The trustworthy AI assistant for Indian Intellectual Property that answers with citations, abstains when unsure, and respects jurisdiction boundaries.
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link href={user ? '/app' : '/register'} className="relative group overflow-hidden rounded-xl bg-shakti text-brand-navy px-8 py-4 font-bold text-base transition-all hover:bg-shaktiHover shadow-lg flex items-center gap-2">
                  <span className="relative z-10 flex items-center gap-2">Ask a question <ArrowRight className="w-5 h-5" /></span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-shimmer" />
                </Link>
                <Link href="/app/reports" className="px-8 py-4 rounded-xl border border-surface-border bg-white text-brand-navy font-bold hover:bg-surface-subtle transition-colors shadow-sm">
                  View Trust Report
                </Link>
              </div>
            </div>

            {/* Floating Cited Answer Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="w-full relative"
            >
              <div className="bg-gradient-to-b from-white to-[#F0F2FB] rounded-2xl p-6 shadow-2xl border border-chakra/20 text-text-main relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-chakra/20 flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5 text-chakra" />
                  </div>
                  <div>
                    <div className="font-semibold text-brand-navy">IP-SAKTI</div>
                    <div className="text-[11px] text-verified flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3 h-3" /> Verified Answer
                    </div>
                  </div>
                </div>
                <p className="font-serif text-[16px] leading-relaxed mb-4 text-text-main">
                  Under Section 3(k) of the Indian Patents Act, 1970, a mathematical or business method or a computer programme per se or algorithms are not patentable<CitationChip id="1" number={1} />. However, if the algorithm is claimed in conjunction with a novel hardware component resulting in a technical effect, it may cross the threshold of patentability<CitationChip id="2" number={2} />.
                </p>
                <div className="bg-surface-subtle rounded-xl p-4 flex gap-6 border border-surface-border">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-secondary uppercase font-semibold">Sources Cited</span>
                    <span className="font-bold text-lg text-brand-navy">2</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-text-secondary uppercase font-semibold">Citation Support</span>
                    <span className="font-bold text-lg text-verified">100%</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-shakti/20 to-chakra/20 blur-3xl -z-10 translate-y-8 scale-105"></div>
            </motion.div>
          </div>
        </section>

        {/* IP CATEGORY ROW */}
        <section className="border-b border-surface-border bg-white py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-12 gap-y-4">
            {['Patent', 'Trademark', 'Copyright', 'Design', 'Trade Secret', 'Geographical Indication'].map(cat => (
              <span key={cat} className="font-semibold text-text-secondary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-chakra"></span> {cat}
              </span>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS TIMELINE */}
        <section id="how-it-works" className="py-24 bg-pagebg">
          <div className="text-center mb-16 max-w-3xl mx-auto px-6">
            <h2 className="text-brand-navy text-4xl mb-4">The Trust Pipeline</h2>
            <p className="text-text-secondary text-lg">Answers are never just generated. They are meticulously assembled, verified, and cited in real-time.</p>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="glass-card h-full flex flex-col items-center text-center p-8 relative z-10 hover:-translate-y-1 transition-transform border-t-4 bg-surface" style={{ borderTopColor: i === 3 ? 'var(--color-warning)' : 'var(--color-chakra)'}}>
                  <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center mb-6 text-chakra">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl mb-3 text-text-main">{step.title}</h3>
                  <p className="text-text-secondary text-sm">{step.desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-border z-0"></div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* BENTO GRID CAPABILITIES */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-brand-navy text-4xl mb-12 text-center">Built for IP & Regulatory Precision</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px]">
              <div className="glass-card md:col-span-8 row-span-1 flex flex-col justify-end overflow-hidden relative group bg-surface-subtle border-none">
                <Scale className="absolute -right-4 -bottom-10 w-64 h-64 text-brand-navy opacity-5 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-20 p-8">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">
                    <Landmark className="w-6 h-6 text-brand-navy" />
                  </div>
                  <h3 className="text-2xl mb-2 text-brand-navy">Cross-Jurisdiction Clarity</h3>
                  <p className="text-text-secondary max-w-md">India, USA, and Australia regulatory pathways kept strictly separate. We never blend rules.</p>
                </div>
              </div>

              <div className="glass-card md:col-span-4 row-span-1 flex flex-col justify-center p-8 bg-warningBg border-warning/20">
                <Shield className="w-10 h-10 text-warning mb-4" />
                <h3 className="text-xl mb-2 text-warning font-bold">Safe Abstention</h3>
                <p className="text-sm text-warning/80 font-medium">If the evidence is missing, conflicting or out of scope, the system explicitly abstains rather than hallucinates.</p>
              </div>

              <div className="glass-card md:col-span-4 row-span-1 flex flex-col justify-center p-8 border-t-4 border-t-shakti bg-surface">
                <FlaskConical className="w-10 h-10 text-shakti mb-4" />
                <h3 className="text-xl mb-2 text-brand-navy">Scientific Integrity</h3>
                <p className="text-sm text-text-secondary">Ingredient-level evidence is always kept strictly separate from finished-formulation evidence.</p>
              </div>

              <div className="glass-card md:col-span-8 row-span-1 flex flex-col justify-end overflow-hidden relative group bg-brand-navy text-white border-none">
                <FileSearch className="absolute -right-4 -bottom-10 w-64 h-64 text-white opacity-5 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-20 p-8">
                  <div className="w-12 h-12 rounded-xl bg-verified flex items-center justify-center mb-4 text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl mb-2 text-white">Automated Fact Verification</h3>
                  <p className="text-blue-100 max-w-md">Every single claim generated is checked against the retrieved source. See visual confidence scores for every answer.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-brand-navy text-on-dark-primary pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <span className="font-heading font-bold text-xl">IP-SAKTI</span>
              </div>
              <p className="text-on-dark-secondary text-sm max-w-sm mb-6 leading-relaxed">
                Evidence-Grounded Intellectual Property and Regulatory Intelligence Copilot.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-wider text-on-dark-muted">Quick Links</h4>
              <ul className="space-y-3 text-sm text-on-dark-secondary">
                <li><Link href="/app" className="hover:text-on-dark-primary transition-colors">Dashboard</Link></li>
                <li><Link href="/app/assistant" className="hover:text-on-dark-primary transition-colors">Ask Assistant</Link></li>
                <li><Link href="/app/reports" className="hover:text-on-dark-primary transition-colors">Trust Report</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-wider text-on-dark-muted">Legal</h4>
              <ul className="space-y-3 text-sm text-on-dark-secondary">
                <li><Link href="/privacy" className="hover:text-on-dark-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-on-dark-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col items-center justify-center text-center">
            {/* Tricolour Divider */}
            <div className="flex w-32 h-1 mb-6 rounded-full overflow-hidden">
              <div className="flex-1 bg-shakti"></div>
              <div className="flex-1 bg-white"></div>
              <div className="flex-1 bg-verified"></div>
            </div>
            
            <p className="text-sm font-medium mb-2 uppercase tracking-widest text-on-dark-secondary">
              Built for Smart India Hackathon
            </p>
            <p className="text-xs text-on-dark-muted max-w-2xl">
              Prototype built for Smart India Hackathon – not an official Government of India service. This system provides decision support and information retrieval, not legal advice. Always verify with official gazettes and consult a registered patent agent or lawyer.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
