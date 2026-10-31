import React from "react";
import { Sparkles, ArrowRight, CheckCircle2, Shield, Radio, FileText, Database, Cpu } from "lucide-react";

interface LandingViewProps {
  onOpenBilling: () => void;
  onOpenInvoices?: () => void;
  onOpenLogin?: () => void;
  isAuthenticated?: boolean;
}

export default function LandingView({
  onOpenBilling,
  onOpenInvoices,
  onOpenLogin,
  isAuthenticated = false,
}: LandingViewProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative text-white min-h-screen">
      {/* Background ambient grid */}
      <div className="grid-bg"></div>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 lg:px-14 pt-8 pb-16 sm:py-20 lg:py-24 max-w-[1450px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 z-10">
            <div className="eyebrow mb-6">
              <Sparkles className="w-3.5 h-3.5 inline text-[#ff7900]" /> AI-POWERED VOICE BILLING
            </div>
            
            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.92] uppercase text-white mb-6">
              YOUR VOICE.<br />
              <span className="text-[#ff7900] relative inline-block">
                YOUR BILL.
                <span className="absolute bottom-1 left-0 w-full h-[4px] bg-[#ff7900] rounded-full"></span>
              </span><br />
              ZERO FRICTION.
            </h1>

            <p className="text-sm sm:text-base text-[#9a9e96] max-w-xl leading-relaxed mb-8">
              Transform spoken commands into intelligent invoices in seconds. AI-powered product recognition, 
              live cashier confirmation, and a quantum-inspired bill identity workflow — built for modern retail.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button
                onClick={onOpenBilling}
                className="btn btn-orange text-xs sm:text-sm px-6 py-3.5 shadow-lg shadow-[#ff7900]/25 rounded-lg flex items-center gap-2 font-bold uppercase tracking-wider"
              >
                Launch Voice Billing <span>↗</span>
              </button>
              
              <button
                onClick={() => scrollTo("workflow")}
                className="btn btn-outline text-xs sm:text-sm px-6 py-3.5 rounded-lg flex items-center gap-2 font-bold uppercase tracking-wider"
              >
                ▷ &nbsp; Explore Workflow
              </button>

              {!isAuthenticated && onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="btn btn-dark text-xs sm:text-sm px-6 py-3.5 rounded-lg flex items-center gap-2 font-bold uppercase tracking-wider"
                >
                  Shopkeeper Login
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#788074]">
              <span className="text-[#70e3a2] text-lg leading-none">●</span>
              <span>Voice-first checkout</span>
              <span>·</span>
              <span>AI-assisted product matching</span>
              <span>·</span>
              <span>Instant PDF invoices</span>
            </div>
          </div>

          {/* Right Hero Visual with Quantum Orb */}
          <div className="lg:col-span-5 flex justify-center items-center relative py-6">
            <div className="absolute w-[360px] h-[360px] bg-[#ff7900]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="quantum-orb">
              <div className="orb-ring"></div>
              <div className="orb-ring r2"></div>
              <div className="orb-ring r3"></div>
              <div className="orb-core">Q</div>
            </div>

            {/* Floating Info Cards */}
            <div className="floating-card float-one hidden sm:block">
              <span className="text-[#ff7900] text-[10px] font-bold tracking-wider">✳ SMART RECOGNITION</span>
              <strong className="block text-lg font-display mt-1 text-white">Voice → Invoice</strong>
              <small className="text-[#899087]">Intelligent billing workflow</small>
            </div>

            <div className="floating-card float-two hidden sm:block">
              <span className="text-[#70e3a2] text-[10px] font-bold tracking-wider">● SYSTEM ARCHITECTURE</span>
              <strong className="block text-lg font-display mt-1 text-white">AI + Quantum</strong>
              <small className="text-[#899087]">Designed for modern retail</small>
            </div>
          </div>
        </div>

        {/* Hero Bottom Stats */}
        <div className="grid grid-cols-3 gap-4 mt-12 pt-6 max-w-lg ml-auto mr-auto lg:mr-0">
          <div className="metric">
            <strong className="text-3xl text-white">AI<span className="text-[#ff7900]">+</span></strong>
            <small>Speech & product<br />understanding</small>
          </div>
          <div className="metric">
            <strong className="text-3xl text-white">Q<span className="text-[#ff7900]">·</span>ID</strong>
            <small>Unique bill identity<br />workflow</small>
          </div>
          <div className="metric">
            <strong className="text-3xl text-white">PDF</strong>
            <small>Structured invoice<br />generation</small>
          </div>
        </div>
      </section>

      {/* Ticker / Banner */}
      <div className="border-y border-[#293329] bg-[#0c120c] py-4 px-6 text-[11px] font-bold tracking-[1.5px] uppercase text-[#737d71] flex flex-wrap items-center justify-around gap-4">
        <span>BUILT FOR <strong className="text-[#b8beb4]">MODERN RETAIL</strong></span>
        <span className="hidden sm:inline">VOICE-FIRST CHECKOUT</span>
        <span className="hidden md:inline">AI-ASSISTED PRODUCT MATCHING</span>
        <span>INVOICE TRACEABILITY</span>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-8 lg:px-14 max-w-[1450px] mx-auto scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow mb-4">THE SMARTQ ADVANTAGE</div>
            <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-white m-0">
              MORE THAN<br />
              <span className="text-[#ff7900]">JUST BILLING.</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#899087] max-w-md m-0 leading-relaxed">
            Designed to streamline checkout with high-accuracy speech recognition, semantic product retrieval, 
            cashier verification, and immutable invoice identity management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <article className="p-6 rounded-xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0d120d] hover:border-[#ff7900]/50 hover:-translate-y-1 transition duration-200">
            <div className="w-11 h-11 rounded-lg border border-[#ff7900]/30 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-xl mb-5">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Voice-first checkout</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Convert spoken cashier commands into editable bills with real-time transcription, ambient noise filtering, and instant cart updates.
            </p>
          </article>

          <article className="p-6 rounded-xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0d120d] hover:border-[#ff7900]/50 hover:-translate-y-1 transition duration-200">
            <div className="w-11 h-11 rounded-lg border border-[#ff7900]/30 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-xl mb-5">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Intelligent product matching</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Leverage RAG and local catalog indexes to map natural language speech to accurate inventory items, quantities, and prices.
            </p>
          </article>

          <article className="p-6 rounded-xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0d120d] hover:border-[#ff7900]/50 hover:-translate-y-1 transition duration-200">
            <div className="w-11 h-11 rounded-lg border border-[#ff7900]/30 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-xl mb-5">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Noise-aware processing</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Optimized for bustling supermarket and retail store conditions with robust speech detection, auto-restart, and offline reliability.
            </p>
          </article>

          <article className="p-6 rounded-xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0d120d] hover:border-[#ff7900]/50 hover:-translate-y-1 transition duration-200">
            <div className="w-11 h-11 rounded-lg border border-[#ff7900]/30 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-xl mb-5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Cashier confirmation</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Quick review gate: Verify product names, quantities, taxes, and final payable amounts before locking and recording the transaction.
            </p>
          </article>

          <article className="p-6 rounded-xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0d120d] hover:border-[#ff7900]/50 hover:-translate-y-1 transition duration-200">
            <div className="w-11 h-11 rounded-lg border border-[#ff7900]/30 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-xl mb-5">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Quantum identity workflow</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Generate unique QGBI bill identifiers backed by quantum circuit random entropy to ensure tamper-proof invoice indexing.
            </p>
          </article>

          <article className="p-6 rounded-xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0d120d] hover:border-[#ff7900]/50 hover:-translate-y-1 transition duration-200">
            <div className="w-11 h-11 rounded-lg border border-[#ff7900]/30 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-xl mb-5">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Invoice-ready output</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Instantly create structured printable receipts, download PDF invoices, dispatch WhatsApp summaries, or collect UPI payments.
            </p>
          </article>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 px-4 sm:px-8 lg:px-14 border-t border-[#293329] max-w-[1450px] mx-auto scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow mb-4">THE PROCESS</div>
            <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-white m-0">
              FROM SPEECH<br />
              TO <span className="text-[#ff7900]">CHECKOUT.</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#899087] max-w-md m-0 leading-relaxed">
            A frictionless cashier workflow engineered for speed and precision.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-xl border-t-2 border-t-[#ff7900] bg-[#101610] border border-[#293329]">
            <div className="font-display font-black text-4xl text-[#ff7900] mb-5">01</div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Capture the voice</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Tap the quantum microphone or press space to capture continuous spoken billing commands.
            </p>
          </div>

          <div className="p-6 rounded-xl border-t-2 border-t-[#ff7900] bg-[#101610] border border-[#293329]">
            <div className="font-display font-black text-4xl text-[#ff7900] mb-5">02</div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Understand the order</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Natural language models extract products, quantities, units, and fetch catalog prices automatically.
            </p>
          </div>

          <div className="p-6 rounded-xl border-t-2 border-t-[#ff7900] bg-[#101610] border border-[#293329]">
            <div className="font-display font-black text-4xl text-[#ff7900] mb-5">03</div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Verify the bill</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Review line items, adjust quantities with single clicks, and authorize with cashier approval.
            </p>
          </div>

          <div className="p-6 rounded-xl border-t-2 border-t-[#ff7900] bg-[#101610] border border-[#293329]">
            <div className="font-display font-black text-4xl text-[#ff7900] mb-5">04</div>
            <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">Generate the invoice</h3>
            <p className="text-xs text-[#899087] leading-relaxed">
              Issue an authenticated invoice with a unique QGBI identity, UPI QR code, and print ready receipt.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-8 lg:px-14 max-w-[1450px] mx-auto">
        <div className="border border-[#ff7900]/40 rounded-2xl p-8 sm:p-12 lg:p-16 bg-radial-at-top-right from-[#ff7900]/15 via-[#101610] to-[#0c110c] flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <div className="eyebrow mb-4">READY TO EXPERIENCE SMARTQ?</div>
            <h2 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-white mb-3">
              LET YOUR VOICE<br />
              DO THE BILLING.
            </h2>
            <p className="text-xs sm:text-sm text-[#899087] max-w-lg m-0 leading-relaxed">
              Jump straight into the cashier terminal, test real-time product matching, 
              or manage store inventory in a single unified workspace.
            </p>
          </div>

          <button
            onClick={onOpenBilling}
            className="btn btn-orange text-sm px-8 py-4 rounded-xl shadow-xl shadow-[#ff7900]/25 font-bold uppercase tracking-wider whitespace-nowrap"
          >
            Open Billing Workspace ↗
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#293329] py-8 px-4 sm:px-8 lg:px-14 max-w-[1450px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#899087]">
        <div className="font-display font-black text-2xl tracking-wider text-white">
          <span className="text-[#ff7900]">SMART</span>Q-BILL
        </div>
        <div className="text-center sm:text-left text-[11px] uppercase tracking-wider">
          AI-Driven Voice Billing with Quantum Bill Identity
        </div>
        <div className="text-[11px] text-[#60675f]">
          DESIGNED FOR MODERN RETAIL · 2026
        </div>
      </footer>
    </div>
  );
}
