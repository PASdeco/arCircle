"use client";

import { useState, useEffect, useCallback } from "react";
import { getContract, getReadContract } from "@/lib/contract";
import WalletButton from "@/components/WalletButton";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";

interface Group {
  id: number;
  creator: string;
  name: string;
  contributionAmount: string;
  memberCount: number;
  currentRound: number;
  roundDeadline: number;
  active: boolean;
}

import Image from "next/image";

interface Props {
  account: string;
  onSelectGroup: (id: number) => void;
  onDisconnect: () => void;
}

function SkeletonCard() {
  return (
    <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/5 rounded-lg" />
          <div className="h-3 w-24 bg-white/5 rounded-lg" />
          <div className="h-3 w-20 bg-white/5 rounded-lg" />
        </div>
        <div className="h-6 w-16 bg-white/5 rounded-full" />
      </div>
    </div>
  );
}

export default function Home({ account, onSelectGroup, onDisconnect }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinError, setJoinError] = useState("");
  const [toast, setToast] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  // Slideshow
  const slides = ["/one.jpg", "/two.jpg", "/three.jpg", "/four.jpg"];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  function showToast(type: "error" | "success", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const loadGroups = useCallback(async () => {
    try {
      const contract = await getReadContract();
      const count = await contract.groupCount();
      const loaded: Group[] = [];
      for (let i = 0; i < Number(count); i++) {
        const g = await contract.getGroup(i);
        loaded.push({
          id: i,
          creator: g.creator,
          name: g.name,
          contributionAmount: ethers.formatUnits(g.contributionAmount, 6),
          memberCount: Number(g.memberCount),
          currentRound: Number(g.currentRound),
          roundDeadline: Number(g.roundDeadline),
          active: g.active,
        });
      }
      setGroups(loaded.reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const contract = await getContract();
      const tx = await contract.createGroup(name, ethers.parseUnits(amount, 6));
      await tx.wait();
      showToast("success", "Circle created! Share the invite link with members.");
      setName(""); setAmount(""); setShowForm(false);
      loadGroups();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  function handleJoinLink(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    try {
      const url = new URL(joinLink.trim());
      const groupId = url.searchParams.get("group");
      if (groupId === null || isNaN(Number(groupId))) throw new Error();
      setShowJoin(false);
      setJoinLink("");
      onSelectGroup(Number(groupId));
    } catch {
      setJoinError("Invalid invite link. Please paste the full link shared by the circle creator.");
    }
  }

  const myGroups = groups.filter(g => g.creator.toLowerCase() === account.toLowerCase());
  const otherGroups = groups.filter(g => g.creator.toLowerCase() !== account.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">

      {/* ── Slideshow Background ── */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={slides[currentSlide]}
              alt=""
              fill
              className="object-cover object-center opacity-60"
              priority
            />
          </motion.div>
        </AnimatePresence>
        {/* Permanent dark overlay so content stays readable */}
        <div className="absolute inset-0 bg-[#0a0a0f]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/80" />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl flex items-center gap-2 ${toast.type === "error" ? "bg-red-500/90 text-white" : "bg-green-500/90 text-white"}`}
          >
            {toast.type === "success" ? "✓" : "✕"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Circle Modal */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowJoin(false); setJoinLink(""); setJoinError(""); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-white font-semibold text-lg">Join a Circle</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Paste the invite link shared by the creator</p>
                </div>
                <button
                  onClick={() => { setShowJoin(false); setJoinLink(""); setJoinError(""); }}
                  className="text-gray-500 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleJoinLink} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Invite Link</label>
                  <input
                    type="text"
                    placeholder="https://arcircle.app/app?group=0"
                    value={joinLink}
                    onChange={(e) => { setJoinLink(e.target.value); setJoinError(""); }}
                    required
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors"
                  />
                  {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/20"
                >
                  Go to Circle →
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="arCircle" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-white text-sm">arCircle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WalletButton account={account} onDisconnect={onDisconnect} />
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 border border-green-500/20 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            >
              💧 <span className="hidden sm:inline">Faucet</span>
            </a>
            <button
              onClick={() => setShowJoin(true)}
              className="shrink-0 border border-white/10 hover:border-violet-500/50 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            >
              Join
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            >
              + Circle
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Slide indicators */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`transition-all duration-300 rounded-full ${
                i === currentSlide
                  ? "w-6 h-1.5 bg-violet-400"
                  : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <p className="text-gray-400 text-sm">Welcome back</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-white font-bold text-xl">
              {(() => { try { const u = localStorage.getItem("arcircle_usernames"); if (u) { const m = JSON.parse(u); return m[account.toLowerCase()] || `${account.slice(0, 8)}...${account.slice(-6)}`; } } catch {} return `${account.slice(0, 8)}...${account.slice(-6)}`; })()}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 text-xs font-mono">{account.slice(0, 10)}...{account.slice(-6)}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(account); }}
              className="text-gray-600 hover:text-violet-400 transition-colors text-xs"
              title="Copy address"
            >
              📋
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-gray-500 text-xs">Your Circles</p>
              <p className="text-white font-bold text-lg">{myGroups.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-gray-500 text-xs">Active Circles</p>
              <p className="text-white font-bold text-lg">{groups.filter(g => g.active).length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-gray-500 text-xs">Total Circles</p>
              <p className="text-white font-bold text-lg">{groups.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#111118]/80 backdrop-blur-md border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-semibold">Create a New Circle</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-lg transition-colors">✕</button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Circle Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos Ajo Group"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Weekly Contribution (USDC)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="0"
                      step="any"
                      className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div className="bg-violet-500/8 border border-violet-500/15 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-violet-300 text-xs">👑 As creator, you will be assigned the last payout position as a trust signal to members.</p>
                    <p className="text-yellow-300/80 text-xs">🔒 All members (including you) must lock <strong>2x</strong> the contribution as collateral. It's returned in full when the circle completes.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/20 flex items-center justify-center gap-2"
                  >
                    {creating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : "Create Circle"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Circles */}
        {myGroups.length > 0 && (
          <section>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">My Circles</p>
            <div className="space-y-3">
              {myGroups.map((g, i) => <GroupCard key={g.id} g={g} account={account} onClick={() => onSelectGroup(g.id)} index={i} />)}
            </div>
          </section>
        )}

        {/* All Circles */}
        <section>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
            {myGroups.length > 0 ? "Other Circles" : "All Circles"}
          </p>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : otherGroups.length === 0 && myGroups.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-12 text-center">
              <Image src="/logo.png" alt="arCircle" width={56} height={56} className="rounded-2xl mx-auto mb-4" />
              <p className="text-white font-semibold">No circles yet</p>
              <p className="text-gray-500 text-sm mt-1">Be the first to create a savings circle</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Create a Circle
              </button>
            </div>
          ) : otherGroups.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">No other circles available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherGroups.map((g, i) => <GroupCard key={g.id} g={g} account={account} onClick={() => onSelectGroup(g.id)} index={i} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function GroupCard({ g, account, onClick, index }: { g: Group; account: string; onClick: () => void; index: number }) {
  const isCreator = g.creator.toLowerCase() === account.toLowerCase();
  const pot = (parseFloat(g.contributionAmount) * g.memberCount).toFixed(2);
  const progress = g.memberCount > 1 ? ((g.currentRound - 1) / g.memberCount) * 100 : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full bg-white/5 hover:bg-white/8 backdrop-blur-md border border-white/8 hover:border-violet-500/30 rounded-2xl p-5 text-left transition-all group shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold">{g.name}</p>
            {isCreator && <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full">Creator</span>}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{g.contributionAmount} USDC / week · Pot: {pot} USDC</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${g.active ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-500"}`}>
            {g.active ? "● Active" : "Completed"}
          </span>
          <span className="text-gray-600 text-xs">ID #{g.id}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{g.memberCount}/5 members</span>
          <span>Round {g.currentRound}/{g.memberCount}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.button>
  );
}
