"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import WalletButton from "@/components/WalletButton";
import { switchToArcTestnet } from "@/lib/contract";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Fade({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {children}
    </div>
  );
}

const steps = [
  { icon: "🔗", title: "Create or Join a Circle", desc: "Start your own savings group or join one with an invite link from a friend." },
  { icon: "💸", title: "Contribute Weekly", desc: "Deposit stablecoins from your wallet every week. Simple, fast, no bank needed." },
  { icon: "🔄", title: "Rotate Payouts", desc: "Each member receives the full pool in their turn — automatically, no coordinator needed." },
  { icon: "📊", title: "Track Everything", desc: "Every contribution and payout is recorded on-chain. Fully transparent, always." },
];

const features = [
  { icon: "⚡", title: "Instant Contributions", desc: "Send your weekly contribution in seconds from any wallet." },
  { icon: "🔍", title: "Transparent Rotations", desc: "Every payout is visible on-chain. No hidden moves." },
  { icon: "🔒", title: "Secure Smart Contracts", desc: "Funds are locked in auditable smart contracts — no one can run away." },
  { icon: "🌍", title: "Global Access", desc: "Participate from anywhere in the world, no borders." },
  { icon: "👛", title: "Wallet-Based Payments", desc: "Connect your wallet and you're ready. No signups, no KYC." },
  { icon: "📡", title: "Real-Time Updates", desc: "See contributions, rounds, and payouts update live." },
];

const useCases = [
  { icon: "👨‍👩‍👧", title: "Friends & Family", desc: "Save together with people you trust." },
  { icon: "🏪", title: "Small Businesses", desc: "Rotate capital to fund business needs." },
  { icon: "🤝", title: "Community Groups", desc: "Cooperatives and associations made simple." },
  { icon: "💼", title: "Freelancers", desc: "Pool funds with peers for bigger payouts." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [account, setAccount] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts[0]) setAccount(accounts[0]);
      });
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || "");
      });
    }
  }, []);

  const handleConnect = useCallback((acc: string) => {
    setAccount(acc);
    router.push("/app");
  }, [router]);

  const handleDisconnect = useCallback(() => setAccount(""), []);

  return (
    <div className="bg-[#0a0a0f] text-white min-h-screen overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0a0f]/90 backdrop-blur border-b border-white/5 shadow-lg" : ""}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="arCircle" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold tracking-tight">arCircle</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#why" className="hover:text-white transition-colors">Why arCircle</a>
            <a href="#usecases" className="hover:text-white transition-colors">Use Cases</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <WalletButton
              account={account}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
            {account && (
              <Link href="/app" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                Open App
              </Link>
            )}
          </div>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#0f0f1a] border-t border-white/5 px-6 py-4 space-y-4 text-sm">
            {["#how", "#features", "#why", "#usecases"].map((href, i) => (
              <a key={i} href={href} onClick={() => setMenuOpen(false)} className="block text-gray-400 hover:text-white transition-colors">
                {["How it works", "Features", "Why arCircle", "Use Cases"][i]}
              </a>
            ))}
            <Link href="/app" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {account ? "Open App" : "Get Started"}
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-700/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-600/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <Fade>
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium px-4 py-2 rounded-full mb-2">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></span>
              Powered by Arc Network · Stablecoin-native
            </div>
          </Fade>

          <Fade delay={100}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Save Together.<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Get Paid Together.
              </span>
            </h1>
          </Fade>

          <Fade delay={200}>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Join trusted savings circles powered by stablecoins. Contribute weekly and receive lump-sum payouts — fast, transparent, and borderless.
            </p>
          </Fade>

          <Fade delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-500/25 text-base">
                Get Started →
              </Link>
              <Link href="/app" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 text-base">
                Create a Circle
              </Link>
            </div>
          </Fade>

          {/* Dashboard mockup */}
          <Fade delay={400}>
            <div className="mt-12 relative mx-auto max-w-2xl">
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-gray-400 text-xs">Active Circle</p>
                    <p className="text-white font-bold text-lg">Lagos Ajo Group</p>
                  </div>
                  <span className="bg-green-500/20 text-green-300 text-xs px-3 py-1 rounded-full">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[["Weekly", "50 USDC"], ["Members", "5/5"], ["Pot", "250 USDC"]].map(([l, v]) => (
                    <div key={l} className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-gray-500 text-xs">{l}</p>
                      <p className="text-white font-bold text-sm mt-1">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { addr: "0x1a2b...3c4d", paid: true, round: 1 },
                    { addr: "0x5e6f...7g8h", paid: true, round: 2 },
                    { addr: "0x9i0j...1k2l", paid: false, round: 3 },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-gray-400 text-xs font-mono">{m.addr}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">Round #{m.round}</span>
                        <span className={`text-xs ${m.paid ? "text-green-400" : "text-yellow-400"}`}>
                          {m.paid ? "✓ Paid" : "⏳ Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Glow under mockup */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-violet-600/30 blur-2xl rounded-full" />
            </div>
          </Fade>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <Fade>
            <p className="text-center text-gray-500 text-sm mb-8">Built on secure blockchain infrastructure</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: "🔐", title: "Secure Payments", desc: "Funds locked in smart contracts" },
                { icon: "📋", title: "Transparent Records", desc: "Every transaction on-chain" },
                { icon: "⚡", title: "Instant Settlements", desc: "Payouts in seconds, not days" },
              ].map((t) => (
                <div key={t.title} className="flex items-center gap-4">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.title}</p>
                    <p className="text-gray-500 text-xs">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Fade>
            <div className="text-center mb-16">
              <p className="text-violet-400 text-sm font-medium mb-3">Simple by design</p>
              <h2 className="text-4xl font-bold">How it works</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <Fade key={s.title} delay={i * 100}>
                <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-violet-500/30 rounded-2xl p-6 transition-all group">
                  <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-violet-500/20 transition-colors">
                    {s.icon}
                  </div>
                  <p className="text-violet-400 text-xs font-medium mb-2">Step {i + 1}</p>
                  <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <Fade>
            <div className="text-center mb-16">
              <p className="text-violet-400 text-sm font-medium mb-3">Everything you need</p>
              <h2 className="text-4xl font-bold">Core Features</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Fade key={f.title} delay={i * 80}>
                <div className="bg-[#0f0f1a] hover:bg-[#13131f] border border-white/5 hover:border-violet-500/20 rounded-2xl p-6 transition-all group cursor-default">
                  <span className="text-3xl mb-4 block">{f.icon}</span>
                  <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why arCircle ── */}
      <section id="why" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Fade>
            <div className="text-center mb-16">
              <p className="text-violet-400 text-sm font-medium mb-3">A better way to save</p>
              <h2 className="text-4xl font-bold">Why arCircle?</h2>
            </div>
          </Fade>
          <Fade delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Traditional */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                <p className="text-gray-400 font-semibold mb-6 flex items-center gap-2">
                  <span className="text-lg">😓</span> Traditional Ajo
                </p>
                <ul className="space-y-4">
                  {["Manual tracking in notebooks", "Risk of coordinator fraud", "Limited to your location", "No proof of contributions", "Disputes with no resolution"].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-gray-500 text-sm">
                      <span className="text-red-400 mt-0.5">✕</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
              {/* arCircle */}
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />
                <p className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Image src="/logo.png" alt="arCircle" width={20} height={20} className="rounded" /> arCircle
                </p>
                <ul className="space-y-4">
                  {["Automated payouts via smart contract", "No coordinator — code runs it", "Global participation, no borders", "Every contribution recorded on-chain", "Transparent, dispute-free system"].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-gray-300 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Fade>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section id="usecases" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <Fade>
            <div className="text-center mb-16">
              <p className="text-violet-400 text-sm font-medium mb-3">Built for everyone</p>
              <h2 className="text-4xl font-bold">Who uses arCircle?</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {useCases.map((u, i) => (
              <Fade key={u.title} delay={i * 100}>
                <div className="bg-[#0f0f1a] border border-white/5 hover:border-violet-500/20 rounded-2xl p-6 text-center transition-all hover:bg-[#13131f] group">
                  <span className="text-4xl mb-4 block">{u.icon}</span>
                  <h3 className="text-white font-semibold mb-2">{u.title}</h3>
                  <p className="text-gray-500 text-sm">{u.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-indigo-900/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-violet-700/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center space-y-8">
          <Fade>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Start Your Circle<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Today</span>
            </h2>
            <p className="text-gray-400 text-lg">No paperwork. No delays. Just simple, trusted savings.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link href="/app" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-500/25 text-base">
                Create a Circle →
              </Link>
              <Link href="/app" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 text-base">
                Join a Circle
              </Link>
            </div>
          </Fade>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="arCircle" width={24} height={24} className="rounded" />
            <span className="font-bold text-white">arCircle</span>
            <span className="text-gray-600 text-sm ml-2">© 2025</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="https://docs.arc.network/arc/concepts/welcome-to-arc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
            <a href="https://x.com/A4bailout" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
            <a href="https://github.com/PASdeco" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://docs.arc.network/arc/concepts/welcome-to-arc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Built on</span>
            <span className="text-violet-400 font-medium">Arc Network</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
