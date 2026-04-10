"use client";

import { useState, useCallback, useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import Home from "@/components/Home";
import GroupDashboard from "@/components/GroupDashboard";

export default function AppPage() {
  const [account, setAccount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const handleConnect = useCallback((acc: string) => setAccount(acc), []);
  const handleDisconnect = useCallback(() => { setAccount(""); setSelectedGroup(null); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("group");
    if (groupId !== null && !isNaN(Number(groupId))) setSelectedGroup(Number(groupId));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const handler = (accounts: string[]) => {
      if (accounts.length === 0) handleDisconnect();
      else setAccount(accounts[0]);
    };
    window.ethereum.on("accountsChanged", handler);
    return () => window.ethereum?.removeListener("accountsChanged", handler);
  }, [handleDisconnect]);

  if (!account) return <WalletConnect onConnect={handleConnect} />;

  if (selectedGroup !== null)
    return <GroupDashboard groupId={selectedGroup} account={account} onBack={() => setSelectedGroup(null)} onDisconnect={handleDisconnect} />;

  return <Home account={account} onSelectGroup={setSelectedGroup} onDisconnect={handleDisconnect} />;
}
