"use client";

import { useState, useCallback, useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import Home from "@/components/Home";
import GroupDashboard from "@/components/GroupDashboard";
import { saveSession, getSession, clearSession } from "@/lib/wallet";

export default function AppPage() {
  const [account, setAccount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Restore session on load
  useEffect(() => {
    const session = getSession();
    if (session) setAccount(session.address);
    setSessionChecked(true);
  }, []);

  // Handle URL group param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("group");
    if (groupId !== null && !isNaN(Number(groupId))) setSelectedGroup(Number(groupId));
  }, []);

  // MetaMask account change listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const handler = (accounts: string[]) => {
      if (accounts.length === 0) handleDisconnect();
      else { setAccount(accounts[0]); saveSession(accounts[0]); }
    };
    window.ethereum.on("accountsChanged", handler);
    return () => window.ethereum?.removeListener("accountsChanged", handler);
  }, []);

  const handleConnect = useCallback((acc: string) => {
    setAccount(acc);
    saveSession(acc);
  }, []);

  const handleDisconnect = useCallback(() => {
    setAccount("");
    setSelectedGroup(null);
    clearSession();
  }, []);

  // Don't render anything until session check is done to avoid flash
  if (!sessionChecked) return null;

  if (!account) return <WalletConnect onConnect={handleConnect} />;

  if (selectedGroup !== null)
    return <GroupDashboard groupId={selectedGroup} account={account} onBack={() => setSelectedGroup(null)} onDisconnect={handleDisconnect} />;

  return <Home account={account} onSelectGroup={setSelectedGroup} onDisconnect={handleDisconnect} />;
}
