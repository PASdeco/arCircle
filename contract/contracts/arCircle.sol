// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract arCircle {
    IERC20 public immutable usdc;

    uint256 public groupCount;

    uint8 constant MAX_MEMBERS = 5;
    uint8 constant MIN_MEMBERS = 2;

    enum MemberStatus { None, Pending, Active, Kicked }

    struct Member {
        MemberStatus status;
        uint8 position;       // payout position (1-based)
        bool collateralPaid;
        bool hasContributedThisRound;
        uint256 collateralBalance; // tracks remaining collateral (starts at 2x)
    }

    struct Group {
        address creator;
        string name;
        uint256 contributionAmount; // in USDC (6 decimals)
        uint256 collateralAmount;   // = 1x contributionAmount
        uint8 memberCount;
        uint8 currentRound;         // which payout position is next
        uint256 roundDeadline;      // timestamp when current round ends
        bool active;
        address[] memberList;
    // ── Pending members list (not yet approved) ─────────────────────────────
        address[] pendingList;
        mapping(address => Member) members;
        mapping(uint8 => address) positionHolder; // position => member address
    }

    mapping(uint256 => Group) private groups;

    // ── Events ──────────────────────────────────────────────────────────────
    event GroupCreated(uint256 indexed groupId, address indexed creator, string name, uint256 contributionAmount);
    event JoinRequested(uint256 indexed groupId, address indexed member, uint8 position);
    event MemberApproved(uint256 indexed groupId, address indexed member);
    event Contributed(uint256 indexed groupId, address indexed member, uint256 amount, uint256 round);
    event PayoutSent(uint256 indexed groupId, address indexed recipient, uint256 amount, uint256 round);
    event MemberKicked(uint256 indexed groupId, address indexed member, uint256 collateralUsed);
    event GroupCompleted(uint256 indexed groupId);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyCreator(uint256 groupId) {
        require(msg.sender == groups[groupId].creator, "Not group creator");
        _;
    }

    modifier groupExists(uint256 groupId) {
        require(groupId < groupCount, "Group does not exist");
        _;
    }

    modifier groupActive(uint256 groupId) {
        require(groups[groupId].active, "Group not active");
        _;
    }

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    // ── Create Group ─────────────────────────────────────────────────────────
    function createGroup(string calldata name, uint256 contributionAmount) external returns (uint256 groupId) {
        require(contributionAmount > 0, "Invalid amount");

        groupId = groupCount++;
        Group storage g = groups[groupId];
        g.creator = msg.sender;
        g.name = name;
        g.contributionAmount = contributionAmount;
        g.collateralAmount = contributionAmount * 2;
        g.active = true;
        g.currentRound = 1;

        // Creator joins automatically at last position (set when group starts)
        g.members[msg.sender] = Member({
            status: MemberStatus.Active,
            position: 0, // assigned when group starts
            collateralPaid: false,
            hasContributedThisRound: false,
            collateralBalance: 0
        });
        g.memberList.push(msg.sender);
        g.memberCount = 1;

        emit GroupCreated(groupId, msg.sender, name, contributionAmount);
    }

    // ── Request to Join ───────────────────────────────────────────────────────
    function requestJoin(uint256 groupId, uint8 position) external groupExists(groupId) groupActive(groupId) {
        Group storage g = groups[groupId];
        require(g.members[msg.sender].status == MemberStatus.None, "Already in group");
        require(g.memberCount < MAX_MEMBERS, "Group full");
        require(position >= 1 && position < MAX_MEMBERS, "Invalid position");
        require(g.positionHolder[position] == address(0), "Position taken");
        require(g.roundDeadline == 0, "Group already started");

        g.members[msg.sender] = Member({
            status: MemberStatus.Pending,
            position: position,
            collateralPaid: false,
            hasContributedThisRound: false,
            collateralBalance: 0
        });
        g.pendingList.push(msg.sender);

        emit JoinRequested(groupId, msg.sender, position);
    }

    // ── Approve Member ────────────────────────────────────────────────────────
    function approveMember(uint256 groupId, address member) external groupExists(groupId) onlyCreator(groupId) {
        Group storage g = groups[groupId];
        require(g.members[member].status == MemberStatus.Pending, "Not pending");
        require(g.memberCount < MAX_MEMBERS, "Group full");
        require(g.roundDeadline == 0, "Group already started");

        // Collect collateral
        require(usdc.transferFrom(member, address(this), g.collateralAmount), "Collateral transfer failed");

        g.members[member].status = MemberStatus.Active;
        g.members[member].collateralPaid = true;
        g.members[member].collateralBalance = g.collateralAmount;
        g.positionHolder[g.members[member].position] = member;
        g.memberList.push(member);
        g.memberCount++;

        emit MemberApproved(groupId, member);
    }

    // ── Start Group (creator kicks off first round) ───────────────────────────
    function startGroup(uint256 groupId) external groupExists(groupId) onlyCreator(groupId) {
        Group storage g = groups[groupId];
        require(g.memberCount >= MIN_MEMBERS, "Need at least 2 members");
        require(g.roundDeadline == 0, "Already started");

        // Assign creator to last position
        uint8 lastPos = g.memberCount;
        require(g.positionHolder[lastPos] == address(0), "Last position taken");
        g.members[g.creator].position = lastPos;
        g.positionHolder[lastPos] = g.creator;

        // Creator pays collateral too
        require(usdc.transferFrom(g.creator, address(this), g.collateralAmount), "Collateral transfer failed");
        g.members[g.creator].collateralPaid = true;
        g.members[g.creator].collateralBalance = g.collateralAmount;

        g.roundDeadline = block.timestamp + 7 days;
    }

    // ── Contribute ────────────────────────────────────────────────────────────
    function contribute(uint256 groupId) external groupExists(groupId) groupActive(groupId) {
        Group storage g = groups[groupId];
        Member storage m = g.members[msg.sender];

        require(m.status == MemberStatus.Active, "Not an active member");
        require(g.roundDeadline > 0, "Group not started");
        require(!m.hasContributedThisRound, "Already contributed this round");
        require(block.timestamp <= g.roundDeadline, "Round deadline passed");

        require(usdc.transferFrom(msg.sender, address(this), g.contributionAmount), "Transfer failed");
        m.hasContributedThisRound = true;

        emit Contributed(groupId, msg.sender, g.contributionAmount, g.currentRound);

        // Check if all active members have contributed → trigger payout
        if (_allContributed(groupId)) {
            _executePayout(groupId);
        }
    }

    // ── Process Missed Payments (callable by anyone after deadline) ───────────
    function processMissedPayments(uint256 groupId) external groupExists(groupId) groupActive(groupId) {
        Group storage g = groups[groupId];
        require(g.roundDeadline > 0 && block.timestamp > g.roundDeadline, "Round still open");

        address recipient = g.positionHolder[g.currentRound];

        for (uint8 i = 0; i < g.memberList.length; i++) {
            address addr = g.memberList[i];
            Member storage m = g.members[addr];
            if (m.status != MemberStatus.Active) continue;
            if (m.hasContributedThisRound) continue;

            // Use collateral to cover missed contribution → marks as contributed
            m.collateralBalance -= g.contributionAmount;
            m.hasContributedThisRound = true;

            // Remaining collateral goes to recipient only if defaulter is NOT the recipient
            // If defaulter IS the recipient, collateral is forfeited (stays in contract)
            address penaltyRecipient = (addr == recipient) ? address(0) : recipient;
            _kickMember(groupId, addr, penaltyRecipient);
        }

        _executePayout(groupId);
    }

    // ── Internal: Execute Payout ──────────────────────────────────────────────
    function _executePayout(uint256 groupId) internal {
        Group storage g = groups[groupId];
        address recipient = g.positionHolder[g.currentRound];

        // Count contributions this round
        uint256 pot = 0;
        for (uint8 i = 0; i < g.memberList.length; i++) {
            address addr = g.memberList[i];
            if (g.members[addr].status == MemberStatus.Active && g.members[addr].hasContributedThisRound) {
                pot += g.contributionAmount;
            }
        }

        // Reset contributions for next round
        for (uint8 i = 0; i < g.memberList.length; i++) {
            g.members[g.memberList[i]].hasContributedThisRound = false;
        }

        if (recipient != address(0) && pot > 0) {
            usdc.transfer(recipient, pot);
            emit PayoutSent(groupId, recipient, pot, g.currentRound);
        }

        g.currentRound++;

        // Check if all rounds complete
        if (g.currentRound > g.memberCount) {
            _closeGroup(groupId);
        } else {
            g.roundDeadline = block.timestamp + 7 days;
        }
    }

    // ── Internal: Kick Member ─────────────────────────────────────────────────
    // remaining collateral after covering missed payment goes to current round recipient
    function _kickMember(uint256 groupId, address member, address recipient) internal {
        Group storage g = groups[groupId];
        Member storage m = g.members[member];
        uint256 remaining = m.collateralBalance;
        m.collateralBalance = 0;
        m.status = MemberStatus.Kicked;

        // Send remaining collateral to recipient as penalty bonus
        if (remaining > 0 && recipient != address(0)) {
            usdc.transfer(recipient, remaining);
        }

        emit MemberKicked(groupId, member, remaining);
    }

    // ── Internal: Close Group & Return Collateral ─────────────────────────────
    function _closeGroup(uint256 groupId) internal {
        Group storage g = groups[groupId];
        g.active = false;

        for (uint8 i = 0; i < g.memberList.length; i++) {
            address addr = g.memberList[i];
            Member storage m = g.members[addr];
            // Return full 2x collateral to members who stayed active throughout
            if (m.status == MemberStatus.Active && m.collateralBalance > 0) {
                uint256 refund = m.collateralBalance;
                m.collateralBalance = 0;
                usdc.transfer(addr, refund);
            }
        }

        emit GroupCompleted(groupId);
    }

    // ── Internal: Check All Contributed ──────────────────────────────────────
    function _allContributed(uint256 groupId) internal view returns (bool) {
        Group storage g = groups[groupId];
        for (uint8 i = 0; i < g.memberList.length; i++) {
            address addr = g.memberList[i];
            if (g.members[addr].status == MemberStatus.Active && !g.members[addr].hasContributedThisRound) {
                return false;
            }
        }
        return true;
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function getGroup(uint256 groupId) external view groupExists(groupId) returns (
        address creator,
        string memory name,
        uint256 contributionAmount,
        uint256 collateralAmount,
        uint8 memberCount,
        uint8 currentRound,
        uint256 roundDeadline,
        bool active
    ) {
        Group storage g = groups[groupId];
        return (g.creator, g.name, g.contributionAmount, g.collateralAmount, g.memberCount, g.currentRound, g.roundDeadline, g.active);
    }

    function getMember(uint256 groupId, address member) external view groupExists(groupId) returns (
        MemberStatus status,
        uint8 position,
        bool collateralPaid,
        bool hasContributedThisRound,
        uint256 collateralBalance
    ) {
        Member storage m = groups[groupId].members[member];
        return (m.status, m.position, m.collateralPaid, m.hasContributedThisRound, m.collateralBalance);
    }

    function getMembers(uint256 groupId) external view groupExists(groupId) returns (address[] memory) {
        return groups[groupId].memberList;
    }

    function getPendingMembers(uint256 groupId) external view groupExists(groupId) returns (address[] memory) {
        return groups[groupId].pendingList;
    }

    function getPositionHolder(uint256 groupId, uint8 position) external view groupExists(groupId) returns (address) {
        return groups[groupId].positionHolder[position];
    }
}
