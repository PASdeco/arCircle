# arCircle

> Decentralized rotating savings platform (Ajo/Esusu) built on Arc Testnet using USDC stablecoins.

---

## The Problem

Rotating savings groups — known as **Ajo** in Yoruba, **Esusu** in Igbo, and **Susu** across West Africa — are one of the oldest and most trusted community savings systems in the world. A group of people pool money together every week, and each week one person receives the full pot. Everyone gets their turn.

The system works beautifully in theory. In practice, it breaks down because of **trust**:

- **Members default** — someone receives their payout early in the cycle, then stops contributing for the remaining rounds
- **No accountability** — there is no enforceable mechanism to punish bad actors or protect honest members
- **Organizer risk** — the person running the group holds all the money, creating a single point of failure and potential for fraud
- **No transparency** — members have no way to verify contributions or balances in real time
- **Late receivers carry the most risk** — the person scheduled to receive last has contributed the most rounds before getting paid, making them the most exposed if the group collapses

arCircle solves all of these problems by putting the entire savings circle on-chain.

---

## The Solution

arCircle is a smart contract-powered savings circle where:

- **All funds are held by the contract**, not a person — no single point of failure
- **Collateral is locked upfront** — every member locks 2x their weekly contribution before the circle starts. This is returned in full when the circle completes successfully
- **Payouts are automatic** — when all members contribute in a round, the contract instantly sends the full pot to the correct recipient. No manual claiming, no delays
- **Defaults are handled on-chain** — if a member misses a payment after the 7-day deadline, their collateral automatically covers their missed contribution so the recipient still receives the full pot. The defaulter is immediately kicked and their remaining collateral is sent to the round recipient as a penalty bonus
- **Creator is always last** — the circle creator is assigned the final payout position as a trust signal to all members. They have the most to lose if the circle fails
- **Full transparency** — every contribution, payout, approval, and kick is recorded on-chain and visible to all members

---

## How It Works

### For the Circle Creator
1. Create a circle with a name and weekly contribution amount
2. Share the invite link with trusted members
3. Review join requests — check each member's collateral approval status before approving
4. Once enough members have joined, start the circle — this locks your own 2x collateral and kicks off round 1
5. You are automatically assigned the last payout position

### For Members
1. Paste the invite link shared by the creator
2. Choose your preferred payout position (1 = paid first, last position = paid last)
3. Pre-approve your USDC collateral (2x weekly contribution) so the creator can approve you
4. Once approved, contribute every week when the round is open
5. When it's your turn, the full pot is automatically sent to your wallet
6. When the circle completes, your full 2x collateral is returned

### Default Protection
- Every member locks **2x** the weekly contribution as collateral
- If a member misses a payment after the 7-day deadline, anyone can trigger `processMissedPayments`
- The defaulter's collateral covers their missed contribution — the recipient still gets the **full pot**
- The defaulter is **immediately kicked** and their remaining collateral (1x) goes to the round recipient as a bonus
- Members who complete the circle honestly get their full collateral back

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity ^0.8.20 |
| Blockchain | Arc Testnet (chainId: 5042002) |
| Stablecoin | USDC (6 decimals) |
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Wallet | ethers.js v6 + MetaMask |
| Animations | Framer Motion |
| Contract Dev | Hardhat |

---

## Contract Details

| | |
|---|---|
| **Network** | Arc Testnet |
| **Chain ID** | 5042002 |
| **Contract Address** | `0x08316fbb68ff181794Edced26692dd335720760c` |
| **USDC Address** | `0x3600000000000000000000000000000000000000` |
| **RPC URL** | https://rpc.testnet.arc.network |
| **Explorer** | https://testnet.arcscan.app |

### Key Contract Functions

| Function | Who Can Call | Description |
|---|---|---|
| `createGroup` | Anyone | Create a new savings circle |
| `requestJoin` | Anyone | Request to join an existing circle |
| `approveMember` | Creator only | Approve a pending member and collect their collateral |
| `startGroup` | Creator only | Start the circle, lock creator collateral, begin round 1 |
| `contribute` | Active members | Pay weekly contribution |
| `processMissedPayments` | Anyone | Trigger after deadline — covers defaults from collateral, kicks defaulters |

---

## Project Structure

```
arCircle/
├── contract/
│   ├── contracts/
│   │   └── arCircle.sol        # Main smart contract
│   ├── scripts/
│   │   └── deploy.js           # Deployment script
│   └── hardhat.config.js       # Hardhat configuration
│
└── frontend/
    ├── app/
    │   ├── page.tsx             # Landing page
    │   └── app/
    │       └── page.tsx         # App entry point
    ├── components/
    │   ├── Home.tsx             # Dashboard — circle list + create form
    │   ├── GroupDashboard.tsx   # Circle detail page
    │   ├── WalletButton.tsx     # Reusable wallet connect/disconnect button
    │   └── WalletConnect.tsx    # Full-screen wallet connect page
    └── lib/
        └── contract.ts          # ABI, addresses, ethers.js helpers
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Arc Testnet USDC from the [Circle Faucet](https://faucet.circle.com)

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy the Contract

Create a `.env` file in the `contract/` folder:

```
PRIVATE_KEY=your_private_key_here
```

Then run:

```bash
cd contract
npm install
npx hardhat run scripts/deploy.js --network arcTestnet
```

Update the `ARCIRCLE_ADDRESS` in `frontend/lib/contract.ts` with the new address.

---

## Adding Arc Testnet to MetaMask

| Field | Value |
|---|---|
| Network Name | Arc Testnet |
| RPC URL | https://rpc.testnet.arc.network |
| Chain ID | 5042002 |
| Currency Symbol | USDC |
| Block Explorer | https://testnet.arcscan.app |

---

## Links

- Twitter: [@A4bailout](https://x.com/A4bailout)
- GitHub: [PASdeco](https://github.com/PASdeco)
- Docs: [Arc Network](https://docs.arc.network/arc/concepts/welcome-to-arc)

---

## License

MIT
