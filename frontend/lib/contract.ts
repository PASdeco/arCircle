import { ethers } from "ethers";

export const ARCIRCLE_ADDRESS = "0x08316fbb68ff181794Edced26692dd335720760c";
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

export const ARC_TESTNET = {
  chainId: "0x4cef52",
  chainName: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

export const ARCIRCLE_ABI = [
  { type: "function", name: "createGroup", inputs: [{ name: "name", type: "string" }, { name: "contributionAmount", type: "uint256" }], outputs: [{ name: "groupId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "requestJoin", inputs: [{ name: "groupId", type: "uint256" }, { name: "position", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "approveMember", inputs: [{ name: "groupId", type: "uint256" }, { name: "member", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "startGroup", inputs: [{ name: "groupId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "contribute", inputs: [{ name: "groupId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "processMissedPayments", inputs: [{ name: "groupId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getGroup", inputs: [{ name: "groupId", type: "uint256" }], outputs: [{ name: "creator", type: "address" }, { name: "name", type: "string" }, { name: "contributionAmount", type: "uint256" }, { name: "collateralAmount", type: "uint256" }, { name: "memberCount", type: "uint8" }, { name: "currentRound", type: "uint8" }, { name: "roundDeadline", type: "uint256" }, { name: "active", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getMember", inputs: [{ name: "groupId", type: "uint256" }, { name: "member", type: "address" }], outputs: [{ name: "status", type: "uint8" }, { name: "position", type: "uint8" }, { name: "collateralPaid", type: "bool" }, { name: "hasContributedThisRound", type: "bool" }, { name: "collateralBalance", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getMembers", inputs: [{ name: "groupId", type: "uint256" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getPendingMembers", inputs: [{ name: "groupId", type: "uint256" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getPositionHolder", inputs: [{ name: "groupId", type: "uint256" }, { name: "position", type: "uint8" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "groupCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "JoinRequested", inputs: [{ name: "groupId", type: "uint256", indexed: true }, { name: "member", type: "address", indexed: true }, { name: "position", type: "uint8", indexed: false }], anonymous: false },
  { type: "event", name: "GroupCreated", inputs: [{ name: "groupId", type: "uint256", indexed: true }, { name: "creator", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }, { name: "contributionAmount", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "MemberApproved", inputs: [{ name: "groupId", type: "uint256", indexed: true }, { name: "member", type: "address", indexed: true }], anonymous: false },
  { type: "event", name: "PayoutSent", inputs: [{ name: "groupId", type: "uint256", indexed: true }, { name: "recipient", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "round", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "MemberKicked", inputs: [{ name: "groupId", type: "uint256", indexed: true }, { name: "member", type: "address", indexed: true }, { name: "collateralUsed", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "GroupCompleted", inputs: [{ name: "groupId", type: "uint256", indexed: true }], anonymous: false },
];

export const USDC_ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
];

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("MetaMask not found");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = await getProvider();
  return provider.getSigner();
}

export async function getContract() {
  const signer = await getSigner();
  return new ethers.Contract(ARCIRCLE_ADDRESS, ARCIRCLE_ABI, signer);
}

export async function getReadContract() {
  const provider = await getProvider();
  return new ethers.Contract(ARCIRCLE_ADDRESS, ARCIRCLE_ABI, provider);
}

export async function getUSDCContract() {
  const signer = await getSigner();
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
}

export async function switchToArcTestnet() {
  try {
    await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_TESTNET.chainId }] });
  } catch {
    await window.ethereum!.request({ method: "wallet_addEthereumChain", params: [ARC_TESTNET] });
  }
}
