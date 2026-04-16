"use client";

import { useState, useEffect } from "react";
import { switchToArcTestnet } from "@/lib/contract";
import { createInAppWallet, loginInAppWallet, importInAppWallet, usernameExists, saveSession } from "@/lib/wallet";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Props {
  onConnect: (account: string) => void;
  onClose?: () => void; // if provided, renders as modal
  initialScreen?: "main" | "login";
}

type Screen = "main" | "create" | "login" | "import" | "backup";

export default function WalletConnect({ onConnect, onClose, initialScreen = "main" }: Props) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isModal = !!onClose;

  // create fields
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirm, setCreateConfirm] = useState("");

  // backup fields
  const [newAddress, setNewAddress] = useState("");
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ address: string; username: string } | null>(null);

  // login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // import fields
  const [importUsername, setImportUsername] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importKey, setImportKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts[0]) { saveSession(accounts[0]); onConnect(accounts[0]); }
      });
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("login") === "1") setScreen("login");
    }
  }, [onConnect]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isModal) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isModal]);

  // Close on Escape key
  useEffect(() => {
    if (!isModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isModal, onClose]);

  function reset() { setError(""); }

  async function connectMetaMask() {
    setLoading(true); setError("");
    try {
      await switchToArcTestnet();
      const accounts = await window.ethereum!.request({ method: "eth_requestAccounts" });
      saveSession(accounts[0]);
      onConnect(accounts[0]);
    } catch {
      setError("MetaMask connection failed. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createUsername.trim()) { setError("Username is required"); return; }
    if (createPassword !== createConfirm) { setError("Passwords do not match"); return; }
    if (createPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (usernameExists(createUsername)) { setError("Username already taken. Try logging in instead."); return; }
    setLoading(true); setError("");
    try {
      const { address, privateKey } = await createInAppWallet(createUsername.trim(), createPassword);
      setNewAddress(address);
      setNewPrivateKey(privateKey);
      setPendingSession({ address, username: createUsername.trim() });
      setScreen("backup");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally { setLoading(false); }
  }

  function copyPrivateKey() {
    navigator.clipboard.writeText(newPrivateKey);
    setKeyCopied(true);
  }

  function handleBackupDone() {
    if (!pendingSession) return;
    saveSession(pendingSession.address, pendingSession.username);
    onConnect(pendingSession.address);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUsername.trim()) { setError("Username is required"); return; }
    setLoading(true); setError("");
    try {
      const address = await loginInAppWallet(loginUsername.trim(), loginPassword);
      saveSession(address, loginUsername.trim());
      onConnect(address);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Wrong username or password");
    } finally { setLoading(false); }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importUsername.trim()) { setError("Username is required"); return; }
    if (importPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (usernameExists(importUsername)) { setError("Username already taken. Choose a different one."); return; }
    setLoading(true); setError("");
    try {
      const key = importKey.trim().startsWith("0x") ? importKey.trim() : `0x${importKey.trim()}`;
      const address = await importInAppWallet(key, importUsername.trim(), importPassword);
      saveSession(address, importUsername.trim());
      onConnect(address);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid private key");
    } finally { setLoading(false); }
  }

  const titles: Record<Screen, string> = {
    main: "Welcome to arCircle",
    create: "Create Account",
    login: "Login",
    import: "Import Wallet",
    backup: "Backup Your Wallet",
  };

  const subtitles: Record<Screen, string> = {
    main: "Choose how you want to get started",
    create: "Your wallet is generated and secured on this device",
    login: "Welcome back — enter your username and password",
    import: "Import an existing wallet with your private key",
    backup: "Save your private key before continuing",
  };

  const cardContent = (
    <div className="bg-[#111118]/90 backdrop-blur-xl border border-white/10 rounded-[20px] p-8 shadow-2xl w-full max-w-sm mx-auto"
      style={{ boxShadow: "0 0 0 1px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.08)" }}
    >
      {/* Logo + Title */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4">
          <Image src="/logo.png" alt="arCircle" width={56} height={56} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-white">{titles[screen]}</h1>
        <p className="text-gray-500 text-sm mt-1">{subtitles[screen]}</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4 text-center">{error}</p>
      )}

      <AnimatePresence mode="wait">

        {/* ── Main ── */}
        {screen === "main" && (
          <motion.div key="main" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
            <button onClick={connectMetaMask} disabled={loading}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-violet-500/30 text-white px-4 py-3.5 rounded-2xl transition-all disabled:opacity-50">
              <span className="text-2xl">🦊</span>
              <div className="text-left">
                <p className="text-sm font-semibold">Connect MetaMask</p>
                <p className="text-gray-500 text-xs">Already have a wallet</p>
              </div>
              {loading && <span className="ml-auto w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-gray-600 text-xs">or</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <button onClick={() => { setScreen("create"); reset(); }}
              className="w-full flex items-center gap-3 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 text-white px-4 py-3.5 rounded-2xl transition-all">
              <span className="text-2xl">✨</span>
              <div className="text-left">
                <p className="text-sm font-semibold">Create Account</p>
                <p className="text-gray-500 text-xs">New to crypto? Start here</p>
              </div>
            </button>
            <button onClick={() => { setScreen("import"); reset(); }}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 text-white px-4 py-3.5 rounded-2xl transition-all">
              <span className="text-2xl">🔑</span>
              <div className="text-left">
                <p className="text-sm font-semibold">Import Wallet</p>
                <p className="text-gray-500 text-xs">Use existing private key</p>
              </div>
            </button>
            <p className="text-gray-600 text-xs text-center pt-2">Powered by Arc Network · USDC stablecoin</p>
          </motion.div>
        )}

        {/* ── Login ── */}
        {screen === "login" && (
          <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Username</label>
                <input type="text" placeholder="Your username" value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)} required autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Password</label>
                <input type="password" placeholder="Your password" value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Logging in...</> : "Login →"}
              </button>
              <p className="text-center text-gray-500 text-xs">
                No account yet?{" "}
                <button type="button" onClick={() => { setScreen("create"); reset(); }} className="text-violet-400 hover:text-violet-300 transition-colors">Create one</button>
              </p>
              <button type="button" onClick={() => { setScreen("main"); reset(); }} className="w-full text-gray-500 hover:text-white text-sm transition-colors py-1">← Back</button>
            </form>
          </motion.div>
        )}

        {/* ── Create ── */}
        {screen === "create" && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Username</label>
                <input type="text" placeholder="e.g. Emeka" value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)} required autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Password</label>
                <input type="password" placeholder="Min. 6 characters" value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Confirm Password</label>
                <input type="password" placeholder="Repeat password" value={createConfirm}
                  onChange={(e) => setCreateConfirm(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl px-4 py-3">
                <p className="text-yellow-300/80 text-xs">⚠️ Save your username and password. They are the only way to access your wallet.</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : "Create Account →"}
              </button>
              <p className="text-center text-gray-500 text-xs">
                Already have an account?{" "}
                <button type="button" onClick={() => { setScreen("login"); reset(); }} className="text-violet-400 hover:text-violet-300 transition-colors">Login</button>
              </p>
              <button type="button" onClick={() => { setScreen("main"); reset(); }} className="w-full text-gray-500 hover:text-white text-sm transition-colors py-1">← Back</button>
            </form>
          </motion.div>
        )}

        {/* ── Import ── */}
        {screen === "import" && (
          <motion.div key="import" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Username</label>
                <input type="text" placeholder="Choose a username" value={importUsername}
                  onChange={(e) => setImportUsername(e.target.value)} required autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Private Key</label>
                <input type="password" placeholder="0x..." value={importKey}
                  onChange={(e) => setImportKey(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors font-mono" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Password</label>
                <input type="password" placeholder="Min. 6 characters" value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</> : "Import Wallet →"}
              </button>
              <button type="button" onClick={() => { setScreen("main"); reset(); }} className="w-full text-gray-500 hover:text-white text-sm transition-colors py-1">← Back</button>
            </form>
          </motion.div>
        )}

        {/* ── Backup ── */}
        {screen === "backup" && (
          <motion.div key="backup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-xs font-semibold mb-1">⚠️ This is shown only once</p>
              <p className="text-gray-400 text-xs">If you clear your browser or switch devices, you will need this private key to recover your wallet.</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Your wallet address</p>
              <p className="text-white text-xs font-mono bg-white/5 rounded-xl px-3 py-2 break-all">{newAddress}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Your private key</p>
              <p className="text-yellow-300 text-xs font-mono bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2 break-all">{newPrivateKey}</p>
            </div>
            <button onClick={copyPrivateKey}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${keyCopied ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"}`}>
              {keyCopied ? "✓ Private Key Copied!" : "Copy Private Key"}
            </button>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={backupConfirmed} onChange={(e) => setBackupConfirmed(e.target.checked)} className="mt-0.5 accent-violet-500" />
              <span className="text-gray-400 text-xs">I have saved my private key in a safe place. I understand that losing it means losing access to my wallet.</span>
            </label>
            <button onClick={handleBackupDone} disabled={!keyCopied || !backupConfirmed}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all">
              I've Saved It — Continue →
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );

  // ── Modal mode (landing page) ─────────────────────────────────────────────
  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-sm overflow-y-auto max-h-[90vh]"
        >
          {cardContent}
        </motion.div>
      </motion.div>
    );
  }

  // ── Full page mode (direct /app navigation) ───────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-700/15 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 w-full">
        {cardContent}
      </div>
    </div>
  );
}
