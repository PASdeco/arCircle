"use client";

import { useState, useRef, useEffect } from "react";
import { getUsername, setUsername, exportPrivateKey, getSession } from "@/lib/wallet";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  account?: string;
  onConnect?: (account: string) => void;
  onDisconnect?: () => void;
}

export default function WalletButton({ account, onConnect, onDisconnect }: Props) {
  const [open, setOpen] = useState(false);
  const [username, setUsernameState] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [copied, setCopied] = useState(false);

  // private key modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportedKey, setExportedKey] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const ref = useRef<HTMLDivElement>(null);
  const [isInAppWallet, setIsInAppWallet] = useState(false);

  useEffect(() => {
    const session = getSession();
    // Check session username OR if address exists in arcircle_wallets storage
    const hasInAppWallet = !!session?.username || (() => {
      try {
        const wallets = JSON.parse(localStorage.getItem("arcircle_wallets") || "{}");
        return Object.values(wallets).some(
          (w: unknown) => (w as { address: string }).address?.toLowerCase() === account?.toLowerCase()
        );
      } catch { return false; }
    })();
    setIsInAppWallet(hasInAppWallet);
  }, [account]);

  useEffect(() => {
    if (account) setUsernameState(getUsername(account));
  }, [account]);

  // Countdown timer when key is revealed
  useEffect(() => {
    if (!exportedKey) return;
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          closeKeyModal();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [exportedKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingUsername(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeKeyModal() {
    setShowKeyModal(false);
    setExportPassword("");
    setExportedKey("");
    setExportError("");
    setKeyCopied(false);
  }

  function copyAddress() {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function saveUsername() {
    if (!account) return;
    setUsername(account, usernameInput.trim());
    setUsernameState(usernameInput.trim());
    setEditingUsername(false);
  }

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setExportLoading(true); setExportError("");
    try {
      // Find username from session or by matching address in wallets storage
      let walletUsername = getSession()?.username || "";
      if (!walletUsername) {
        const wallets = JSON.parse(localStorage.getItem("arcircle_wallets") || "{}");
        const entry = Object.entries(wallets).find(
          ([, w]) => (w as { address: string }).address?.toLowerCase() === account?.toLowerCase()
        );
        if (entry) walletUsername = entry[0];
      }
      if (!walletUsername) throw new Error("No in-app wallet found");
      const key = await exportPrivateKey(walletUsername, exportPassword);
      setExportedKey(key);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Wrong password");
    } finally { setExportLoading(false); }
  }

  function copyKey() {
    navigator.clipboard.writeText(exportedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  const displayName = username || `${account?.slice(0, 6)}...${account?.slice(-4)}`;

  if (!account) return null;

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 px-3 py-2 rounded-xl transition-colors">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-300 font-medium">{displayName}</span>
          <svg className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Address + copy */}
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-gray-500 text-xs mb-1">Wallet Address</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white text-xs font-mono truncate">{account}</p>
                  <button onClick={copyAddress}
                    className={`shrink-0 text-xs px-2 py-1 rounded-lg transition-colors ${copied ? "bg-green-500/20 text-green-400" : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"}`}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-green-400 text-xs">Arc Testnet</span>
                </div>
              </div>

              {/* Username */}
              <div className="px-4 py-3 border-b border-white/5">
                {editingUsername ? (
                  <div className="space-y-2">
                    <p className="text-gray-500 text-xs">Edit username</p>
                    <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="e.g. Emeka" autoFocus maxLength={20}
                      className="w-full bg-white/5 border border-violet-500/40 rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setEditingUsername(false); }} />
                    <div className="flex gap-2">
                      <button onClick={saveUsername} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs py-1.5 rounded-lg transition-colors">Save</button>
                      <button onClick={() => setEditingUsername(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs py-1.5 rounded-lg transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setUsernameInput(username); setEditingUsername(true); }}
                    className="w-full flex items-center justify-between hover:bg-white/5 rounded-lg px-1 py-1 transition-colors group">
                    <div>
                      <p className="text-gray-500 text-xs">Username</p>
                      <p className="text-white text-sm mt-0.5">{username || "Not set"}</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-violet-400 text-xs transition-colors">✏️ Edit</span>
                  </button>
                )}
              </div>

              {/* Export private key — only for in-app wallets */}
              {isInAppWallet && (
                <div className="px-4 py-3 border-b border-white/5">
                  <button
                    onClick={() => { setOpen(false); setShowKeyModal(true); }}
                    className="w-full flex items-center justify-between hover:bg-white/5 rounded-lg px-1 py-1 transition-colors group">
                    <div>
                      <p className="text-gray-500 text-xs">Private Key</p>
                      <p className="text-white text-sm mt-0.5">View & Backup</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-yellow-400 text-xs transition-colors">🔐 View</span>
                  </button>
                </div>
              )}

              {/* Disconnect */}
              <button onClick={() => { setOpen(false); onDisconnect?.(); }}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/8 transition-colors flex items-center gap-2">
                <span>⏻</span> Disconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Private Key Modal ── */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={closeKeyModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-white font-semibold text-lg">🔐 Private Key</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Enter your password to reveal</p>
                </div>
                <button onClick={closeKeyModal} className="text-gray-500 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
              </div>

              {!exportedKey ? (
                // Password form
                <form onSubmit={handleExport} className="space-y-4">
                  <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl px-4 py-3">
                    <p className="text-yellow-300/80 text-xs">⚠️ Never share your private key with anyone. Anyone with this key has full access to your wallet.</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Your Password</label>
                    <input
                      type="password"
                      placeholder="Enter your wallet password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      required
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors"
                    />
                  </div>
                  {exportError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-center">{exportError}</p>
                  )}
                  <button type="submit" disabled={exportLoading}
                    className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300 font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {exportLoading ? <><span className="w-4 h-4 border-2 border-yellow-300/30 border-t-yellow-300 rounded-full animate-spin" /> Decrypting...</> : "Reveal Private Key"}
                  </button>
                </form>
              ) : (
                // Key revealed
                <div className="space-y-4">
                  <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-xs font-semibold">⚠️ Never share this with anyone — auto-hides in {countdown}s</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs mb-2">Wallet Address</p>
                    <p className="text-gray-300 text-xs font-mono bg-white/5 rounded-xl px-4 py-3 break-all">{account}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs mb-2">Private Key</p>
                    <p className="text-yellow-300 text-xs font-mono bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 break-all">{exportedKey}</p>
                  </div>

                  <button onClick={copyKey}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${keyCopied ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"}`}>
                    {keyCopied ? "✓ Copied to clipboard!" : "Copy Private Key"}
                  </button>

                  <button onClick={closeKeyModal} className="w-full text-gray-500 hover:text-white text-sm transition-colors py-1">
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
