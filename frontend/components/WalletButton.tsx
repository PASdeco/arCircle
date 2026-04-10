"use client";

import { useState, useRef, useEffect } from "react";
import { switchToArcTestnet } from "@/lib/contract";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  account?: string;
  onConnect?: (account: string) => void;
  onDisconnect?: () => void;
}

export default function WalletButton({ account, onConnect, onDisconnect }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function connect() {
    if (!onConnect) return;
    setLoading(true);
    try {
      await switchToArcTestnet();
      const accounts = await window.ethereum!.request({ method: "eth_requestAccounts" });
      onConnect(accounts[0]);
    } finally {
      setLoading(false);
    }
  }

  if (!account) {
    return (
      <button
        onClick={connect}
        disabled={loading}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/20"
      >
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>🦊</span>}
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 px-3 py-2 rounded-xl transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm text-gray-300 font-medium">{account.slice(0, 6)}...{account.slice(-4)}</span>
        <svg className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-52 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-gray-500 text-xs">Connected wallet</p>
              <p className="text-white text-sm font-mono mt-0.5">{account.slice(0, 12)}...{account.slice(-6)}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-green-400 text-xs">Arc Testnet</span>
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); onDisconnect?.(); }}
              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/8 transition-colors flex items-center gap-2"
            >
              <span>⏻</span> Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
