import { ethers } from "ethers";

const WALLETS_KEY = "arcircle_wallets";     // stores all wallets by username
const SESSION_KEY = "arcircle_session";
const USERNAME_KEY = "arcircle_usernames";

// ── Wallet storage structure ──────────────────────────────────────────────────
// Stored as a map: { username -> { address, encryptedJson } }

export interface StoredWallet {
  address: string;
  encryptedJson: string;
}

function getAllWallets(): Record<string, StoredWallet> {
  const raw = localStorage.getItem(WALLETS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function saveAllWallets(wallets: Record<string, StoredWallet>) {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

// ── Create wallet (username + password) ──────────────────────────────────────

export async function createInAppWallet(username: string, password: string): Promise<{ address: string; privateKey: string }> {
  const wallets = getAllWallets();
  if (wallets[username.toLowerCase()]) throw new Error("Username already taken");
  const wallet = ethers.Wallet.createRandom();
  const encryptedJson = await wallet.encrypt(password);
  wallets[username.toLowerCase()] = { address: wallet.address, encryptedJson };
  saveAllWallets(wallets);
  setUsername(wallet.address, username);
  return { address: wallet.address, privateKey: wallet.privateKey };
}

// ── Login (username + password) ───────────────────────────────────────────────

export async function loginInAppWallet(username: string, password: string): Promise<string> {
  const wallets = getAllWallets();
  const stored = wallets[username.toLowerCase()];
  if (!stored) {
    // Fallback: check old single-wallet storage (arcircle_wallet)
    const oldRaw = localStorage.getItem("arcircle_wallet");
    if (oldRaw) {
      try {
        const old = JSON.parse(oldRaw);
        const wallet = await ethers.Wallet.fromEncryptedJson(old.encryptedJson, password);
        // Migrate to new system
        wallets[username.toLowerCase()] = { address: wallet.address, encryptedJson: old.encryptedJson };
        saveAllWallets(wallets);
        setUsername(wallet.address, username);
        localStorage.removeItem("arcircle_wallet");
        return wallet.address;
      } catch { throw new Error("Wrong password"); }
    }
    throw new Error("Username not found. Please create an account first.");
  }
  const wallet = await ethers.Wallet.fromEncryptedJson(stored.encryptedJson, password);
  return wallet.address;
}

// ── Import wallet (private key + username + password) ────────────────────────

export async function importInAppWallet(privateKey: string, username: string, password: string): Promise<string> {
  const wallets = getAllWallets();
  if (wallets[username.toLowerCase()]) throw new Error("Username already taken");
  const wallet = new ethers.Wallet(privateKey);
  const encryptedJson = await wallet.encrypt(password);
  wallets[username.toLowerCase()] = { address: wallet.address, encryptedJson };
  saveAllWallets(wallets);
  setUsername(wallet.address, username);
  return wallet.address;
}

// ── Export private key (username + password) ─────────────────────────────────

export async function exportPrivateKey(username: string, password: string): Promise<string> {
  const wallets = getAllWallets();
  const stored = wallets[username.toLowerCase()];
  if (!stored) throw new Error("Wallet not found");
  const wallet = await ethers.Wallet.fromEncryptedJson(stored.encryptedJson, password);
  return wallet.privateKey;
}

// ── Check if username exists ──────────────────────────────────────────────────

export function usernameExists(username: string): boolean {
  const wallets = getAllWallets();
  return !!wallets[username.toLowerCase()];
}

// ── Get stored wallet address by username ────────────────────────────────────

export function getWalletAddressByUsername(username: string): string | null {
  const wallets = getAllWallets();
  return wallets[username.toLowerCase()]?.address || null;
}

// ── Session management ────────────────────────────────────────────────────────

export function saveSession(address: string, username?: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ address: address.toLowerCase(), username: username || "" }));
}

export function getSession(): { address: string; username: string } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Username management ───────────────────────────────────────────────────────

export function getUsername(address: string): string {
  const raw = localStorage.getItem(USERNAME_KEY);
  if (!raw) return "";
  try {
    const map: Record<string, string> = JSON.parse(raw);
    return map[address.toLowerCase()] || "";
  } catch { return ""; }
}

export function setUsername(address: string, username: string) {
  const raw = localStorage.getItem(USERNAME_KEY);
  const map: Record<string, string> = raw ? JSON.parse(raw) : {};
  map[address.toLowerCase()] = username.trim();
  localStorage.setItem(USERNAME_KEY, JSON.stringify(map));
}

// ── In-app signer for contract calls ─────────────────────────────────────────

export async function getInAppSigner(username: string, password: string): Promise<ethers.HDNodeWallet | ethers.Wallet> {
  const wallets = getAllWallets();
  const stored = wallets[username.toLowerCase()];
  if (!stored) throw new Error("Wallet not found");
  const wallet = await ethers.Wallet.fromEncryptedJson(stored.encryptedJson, password);
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  return wallet.connect(provider);
}
