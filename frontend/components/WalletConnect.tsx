"use client";

import { useState, useEffect } from "react";
import { switchToArcTestnet } from "@/lib/contract";
import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
  onConnect: (account: string) => void;
}

export default function WalletConnect({ onConnect }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts[0]) onConnect(accounts[0]);
      });
    }
  }, [onConnect]);

  async function connect() {
    setLoading(true); setError("");
    try {
      await switchToArcTestnet();
      const accounts = await window.ethereum!.request({ method: "eth_requestAccounts" });
      onConnect(accounts[0]);
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-700/15 rounded-full blur-[100px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-[#111118] border border-white/8 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto">
            <Image src="/logo.png" alt="arCircle" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome to arCircle</h1>
            <p className="text-gray-500 text-sm mt-2">Connect your wallet to start saving with your circle</p>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}
          <button
            onClick={connect}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-all hover:shadow-lg hover:shadow-violet-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
            ) : (
              <><span>🦊</span> Connect MetaMask</>
            )}
          </button>
          <p className="text-gray-600 text-xs">Powered by Arc Network · USDC stablecoin</p>
        </div>
      </motion.div>
    </div>
  );
}
