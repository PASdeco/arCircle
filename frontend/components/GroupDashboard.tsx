"use client";

import { useState, useEffect, useCallback } from "react";
import { getContract, getReadContract, getUSDCContract, ARCIRCLE_ADDRESS } from "@/lib/contract";
import WalletButton from "@/components/WalletButton";
import Image from "next/image";
import { ethers } from "ethers";

const STATUS_LABEL: Record<number, string> = { 0: "None", 1: "Pending", 2: "Active", 3: "Kicked" };
const STATUS_COLOR: Record<number, string> = {
  0: "text-gray-400", 1: "text-yellow-300", 2: "text-green-300", 3: "text-red-400",
};

interface MemberInfo {
  address: string;
  status: number;
  position: number;
  collateralBalance: string;
  hasContributed: boolean;
}

interface GroupData {
  creator: string;
  name: string;
  contributionAmount: string;
  collateralAmount: string;
  memberCount: number;
  currentRound: number;
  roundDeadline: number;
  active: boolean;
}

interface Props {
  groupId: number;
  account: string;
  onBack: () => void;
  onDisconnect: () => void;
}

export default function GroupDashboard({ groupId, account, onBack, onDisconnect }: Props) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [myMember, setMyMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [joinPosition, setJoinPosition] = useState("1");
  const [pendingMembers, setPendingMembers] = useState<string[]>([]);

  const isCreator = group?.creator.toLowerCase() === account.toLowerCase();

  const load = useCallback(async () => {
    try {
      const contract = await getReadContract();
      const g = await contract.getGroup(groupId);
      const groupData: GroupData = {
        creator: g.creator,
        name: g.name,
        contributionAmount: ethers.formatUnits(g.contributionAmount, 6),
        collateralAmount: ethers.formatUnits(g.collateralAmount, 6),
        memberCount: Number(g.memberCount),
        currentRound: Number(g.currentRound),
        roundDeadline: Number(g.roundDeadline),
        active: g.active,
      };
      setGroup(groupData);

      // Active/kicked members
      const memberAddrs: string[] = await contract.getMembers(groupId);
      const memberData: MemberInfo[] = await Promise.all(
        memberAddrs.map(async (addr) => {
          const m = await contract.getMember(groupId, addr);
          return {
            address: addr,
            status: Number(m.status),
            position: Number(m.position),
            collateralBalance: ethers.formatUnits(m.collateralBalance, 6),
            hasContributed: m.hasContributedThisRound,
          };
        })
      );
      setMembers(memberData);

      // Pending members directly from contract
      const pendingAddrs: string[] = await contract.getPendingMembers(groupId);
      // Filter out any that got approved already
      const stillPending = await Promise.all(
        pendingAddrs.map(async (addr) => {
          const m = await contract.getMember(groupId, addr);
          return Number(m.status) === 1 ? addr : null;
        })
      );
      setPendingMembers(stillPending.filter(Boolean) as string[]);

      // My status
      const myAddr = memberAddrs.find((a) => a.toLowerCase() === account.toLowerCase());
      if (myAddr) {
        const m = await contract.getMember(groupId, myAddr);
        setMyMember({ address: myAddr, status: Number(m.status), position: Number(m.position), collateralBalance: ethers.formatUnits(m.collateralBalance, 6), hasContributed: m.hasContributedThisRound });
      } else {
        const m = await contract.getMember(groupId, account);
        setMyMember(Number(m.status) !== 0 ? { address: account, status: Number(m.status), position: Number(m.position), collateralBalance: ethers.formatUnits(m.collateralBalance, 6), hasContributed: m.hasContributedThisRound } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [groupId, account]);

  useEffect(() => { load(); }, [load]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("join"); setStatus(null);
    try {
      const contract = await getContract();
      const tx = await contract.requestJoin(groupId, parseInt(joinPosition));
      await tx.wait();
      setStatus({ type: "success", msg: "Join request sent! Waiting for creator approval." });
      load();
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally { setActionLoading(""); }
  }

  async function handleApprove(member: string) {
    setActionLoading("approve-" + member); setStatus(null);
    try {
      // Check member's USDC allowance first
      const contract = await getReadContract();
      const { getProvider, USDC_ADDRESS, USDC_ABI, ARCIRCLE_ADDRESS } = await import("@/lib/contract");
      const provider = await getProvider();
      const usdc = new (await import("ethers")).ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      const allowance = await usdc.allowance(member, ARCIRCLE_ADDRESS);
      const required = (await import("ethers")).ethers.parseUnits(group!.collateralAmount, 6);
      if (allowance < required) {
        setStatus({ type: "error", msg: `Member hasn't approved their collateral yet. Ask them to click "Approve Collateral" on their end first.` });
        return;
      }
      const writeContract = await getContract();
      const tx = await writeContract.approveMember(groupId, member);
      await tx.wait();
      setStatus({ type: "success", msg: `${member.slice(0, 8)}... approved!` });
      load();
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally { setActionLoading(""); }
  }

  async function handleStart() {
    setActionLoading("start"); setStatus(null);
    try {
      const usdc = await getUSDCContract();
      const collateral = ethers.parseUnits(group!.collateralAmount, 6);
      const approveTx = await usdc.approve(ARCIRCLE_ADDRESS, collateral);
      await approveTx.wait();
      const contract = await getContract();
      const tx = await contract.startGroup(groupId);
      await tx.wait();
      setStatus({ type: "success", msg: "Circle started! First round is live." });
      load();
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally { setActionLoading(""); }
  }

  async function handleContribute() {
    setActionLoading("contribute"); setStatus(null);
    try {
      const usdc = await getUSDCContract();
      const amount = ethers.parseUnits(group!.contributionAmount, 6);
      const approveTx = await usdc.approve(ARCIRCLE_ADDRESS, amount);
      await approveTx.wait();
      const contract = await getContract();
      const tx = await contract.contribute(groupId);
      await tx.wait();
      setStatus({ type: "success", msg: "Contribution sent!" });
      load();
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally { setActionLoading(""); }
  }

  async function handleApproveCollateral() {
    setActionLoading("collateral"); setStatus(null);
    try {
      const usdc = await getUSDCContract();
      const collateral = ethers.parseUnits(group!.collateralAmount, 6);
      const tx = await usdc.approve(ARCIRCLE_ADDRESS, collateral);
      await tx.wait();
      setStatus({ type: "success", msg: "Collateral approved! Creator can now approve your membership." });
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally { setActionLoading(""); }
  }

  async function handleProcessMissed() {
    setActionLoading("missed"); setStatus(null);
    try {
      const contract = await getContract();
      const tx = await contract.processMissedPayments(groupId);
      await tx.wait();
      setStatus({ type: "success", msg: "Missed payments processed." });
      load();
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed" });
    } finally { setActionLoading(""); }
  }

  const [copied, setCopied] = useState(false);

  function copyInviteLink() {
    const url = `${window.location.origin}?group=${groupId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const deadlinePassed = group && group.roundDeadline > 0 && Date.now() / 1000 > group.roundDeadline;
  const takenPositions = members.filter((m) => m.status !== 0).map((m) => m.position);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <span className="w-5 h-5 border-2 border-gray-600 border-t-violet-500 rounded-full animate-spin" />
        Loading circle...
      </div>
    </div>
  );

  if (!group) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">← Back</button>
          <span className="text-gray-700">|</span>
          <h1 className="text-white font-bold text-lg">{group.name}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${group.active ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"}`}>
              {group.active ? "Active" : "Completed"}
            </span>
            <WalletButton account={account} onDisconnect={onDisconnect} />
          </div>
        </div>

        {/* Status */}
        {status && (
          <p className={`text-sm p-3 rounded-xl ${status.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
            {status.msg}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Weekly Contribution", value: `${group.contributionAmount} USDC` },
            { label: "Members", value: `${group.memberCount}/5` },
            { label: "Current Round", value: `${group.currentRound} of ${group.memberCount}` },
            { label: "Pot This Round", value: `${(parseFloat(group.contributionAmount) * group.memberCount).toFixed(2)} USDC` },
          ].map((s) => (
            <div key={s.label} className="bg-[#111118] border border-white/5 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-white font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Round Deadline */}
        {group.roundDeadline > 0 && (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs">Round Deadline</p>
            <p className="text-white font-medium mt-1">
              {new Date(group.roundDeadline * 1000).toLocaleString()}
            </p>
            {deadlinePassed && (
              <button
                onClick={handleProcessMissed}
                disabled={actionLoading === "missed"}
                className="mt-3 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "missed" ? "Processing..." : "Process Missed Payments"}
              </button>
            )}
          </div>
        )}

        {/* Members */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Members</h2>
          <div className="space-y-2">
            {members.map((m) => {
              const isCurrentRound = m.position === group.currentRound;
              return (
              <div key={m.address} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${isCurrentRound ? "bg-violet-500/10 border border-violet-500/20" : "hover:bg-white/3"}`}>
                <div>
                  <p className="text-white text-sm">
                    {m.address.slice(0, 8)}...{m.address.slice(-4)}
                    {m.address.toLowerCase() === account.toLowerCase() && <span className="text-violet-400 text-xs ml-2">(you)</span>}
                    {m.address.toLowerCase() === group.creator.toLowerCase() && <span className="text-yellow-400 text-xs ml-2">👑</span>}
                    {isCurrentRound && <span className="text-violet-300 text-xs ml-2">🎯 receiving this round</span>}
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Position #{m.position} · receives {(parseFloat(group.contributionAmount) * group.memberCount).toFixed(2)} USDC on round {m.position}
                  </p>
                  {m.status === 2 && <p className="text-gray-600 text-xs mt-0.5">Collateral locked: {m.collateralBalance} USDC</p>}
                </div>
                <div className="flex items-center gap-2">
                  {m.hasContributed && <span className="text-xs text-green-400">✓ Paid</span>}
                  <span className={`text-xs font-medium ${STATUS_COLOR[m.status]}`}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Creator Actions */}
        {isCreator && (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              Creator Actions
              {pendingMembers.length > 0 && (
                <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingMembers.length} pending
                </span>
              )}
            </h2>

            {/* Invite link */}
            <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-violet-300 text-xs">Invite Link</p>
                <p className="text-white text-xs font-mono mt-0.5 truncate max-w-[200px]">
                  {typeof window !== "undefined" ? `${window.location.origin}?group=${groupId}` : ""}
                </p>
              </div>
              <button
                onClick={copyInviteLink}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  copied ? "bg-green-500/20 text-green-300" : "bg-violet-600 hover:bg-violet-500 text-white"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>

            {/* Pending approvals */}
            {pendingMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-violet-300 text-xs">Pending Approvals</p>
                {pendingMembers.map((addr) => (
                  <PendingMemberRow
                    key={addr}
                    addr={addr}
                    collateralAmount={group.collateralAmount}
                    loading={actionLoading === "approve-" + addr}
                    onApprove={() => handleApprove(addr)}
                  />
                ))}
              </div>
            )}

            {/* Start group */}
            {group.roundDeadline === 0 && group.memberCount >= 2 && (
              <div className="space-y-2">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                  <p className="text-yellow-300 text-xs">🔒 Starting the circle will lock your <strong>{group.collateralAmount} USDC</strong> collateral (2x contribution). Make sure you have enough USDC approved.</p>
                </div>
                <button
                  onClick={handleStart}
                  disabled={actionLoading === "start"}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "start" ? "Starting..." : `Start Circle · Lock ${group.collateralAmount} USDC`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Member Actions */}
        {!isCreator && (
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 space-y-3">
            <h2 className="text-white font-semibold">Your Actions</h2>

            {/* Not in group yet */}
            {!myMember && group.roundDeadline === 0 && (
              <form onSubmit={handleJoin} className="space-y-3">
                <p className="text-gray-400 text-sm">Choose your payout position to join</p>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].filter((p) => !takenPositions.includes(p)).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setJoinPosition(String(p))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${joinPosition === String(p) ? "bg-violet-600 text-white border-violet-600" : "border-white/10 text-gray-400 hover:border-violet-500 hover:text-white"}`}
                    >
                      #{p}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === "join"}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "join" ? "Requesting..." : "Request to Join"}
                </button>
              </form>
            )}

            {!myMember && group.roundDeadline > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-medium">Circle already started</p>
                <p className="text-gray-500 text-xs mt-1">This circle has already begun its rounds. New members can only join before the circle starts.</p>
              </div>
            )}

            {/* Pending — approve collateral */}
            {myMember?.status === 1 && (
              <div className="space-y-2">
                <p className="text-yellow-400 text-sm">Your request is pending approval.</p>
                <p className="text-gray-500 text-xs">Pre-approve your collateral ({group.collateralAmount} USDC = 2x weekly contribution) so the creator can approve you. This is returned when the circle completes.</p>
                <button
                  onClick={handleApproveCollateral}
                  disabled={actionLoading === "collateral"}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "collateral" ? "Approving..." : `Approve ${group.collateralAmount} USDC Collateral`}
                </button>
              </div>
            )}

            {/* Active — contribute */}
            {myMember?.status === 2 && group.roundDeadline > 0 && !myMember.hasContributed && (
              <button
                onClick={handleContribute}
                disabled={actionLoading === "contribute"}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {actionLoading === "contribute" ? "Contributing..." : `Contribute ${group.contributionAmount} USDC`}
              </button>
            )}

            {myMember?.status === 2 && myMember.hasContributed && (
              <p className="text-green-300 text-sm text-center py-2">✓ You've contributed this round</p>
            )}

            {myMember?.status === 3 && (
              <p className="text-red-400 text-sm text-center py-2">You have been removed from this circle.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingMemberRow({ addr, collateralAmount, loading, onApprove }: {
  addr: string;
  collateralAmount: string;
  loading: boolean;
  onApprove: () => void;
}) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [statusMsg, setStatusMsg] = useState("Checking...");

  useEffect(() => {
    async function check() {
      try {
        const { getProvider, USDC_ADDRESS, USDC_ABI, ARCIRCLE_ADDRESS } = await import("@/lib/contract");
        const provider = await getProvider();
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
        const required = ethers.parseUnits(collateralAmount, 6);
        const [allowance, balance] = await Promise.all([
          usdc.allowance(addr, ARCIRCLE_ADDRESS),
          usdc.balanceOf(addr),
        ]);
        if (balance < required) {
          setReady(false);
          setStatusMsg(`✕ Insufficient USDC balance (needs ${collateralAmount} USDC)`);
        } else if (allowance < required) {
          setReady(false);
          setStatusMsg("⏳ Waiting for collateral approval");
        } else {
          setReady(true);
          setStatusMsg("✓ Ready to approve");
        }
      } catch { setReady(false); setStatusMsg("Could not verify"); }
    }
    check();
  }, [addr, collateralAmount]);

  return (
    <div className="flex items-center justify-between bg-white/3 border border-white/5 rounded-xl p-3">
      <div>
        <p className="text-white text-sm">{addr.slice(0, 10)}...{addr.slice(-4)}</p>
        <p className={`text-xs mt-0.5 ${
          ready === null ? "text-gray-500" :
          ready ? "text-green-400" :
          statusMsg.startsWith("✕") ? "text-red-400" : "text-yellow-400"
        }`}>
          {ready === null ? "Checking..." : statusMsg}
        </p>
      </div>
      <button
        onClick={onApprove}
        disabled={loading || !ready}
        className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
      >
        {loading ? "Approving..." : "Approve"}
      </button>
    </div>
  );
}
