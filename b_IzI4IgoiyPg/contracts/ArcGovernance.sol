// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ArcGovernance
/// @notice Proof of Presence + weighted governance (ARC CORE tiers). SAY GM = one tx, 10 on-chain pulses in a burst.
contract ArcGovernance {
    struct Chamber {
        uint256 id;
        string title;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
    }

    /// @notice Presence pulses sealed in one SAY GM transaction.
    uint256 public constant GM_FRAGMENTS_PER_BURST = 10;
    /// @notice Max completed SAY GM waves per wallet per UTC day.
    uint256 public constant MAX_GM_BURSTS_PER_DAY = 10;
    /// @notice Presence points granted when a full wave (10 fragments) completes.
    uint256 public constant PRESENCE_PER_BURST = 10;
    /// @notice Presence points for each sealed chamber vote (ARC CORE · voting participation).
    uint256 public constant PRESENCE_PER_VOTE = 20;

    uint256 public chamberCount;
    mapping(uint256 => Chamber) private _chambers;

    /// @notice Total presence score (ARC CORE whitepaper · Proof of Presence).
    mapping(address => uint256) public presenceScore;

    /// @notice UTC day index (block.timestamp / 1 days) for burst accounting.
    mapping(address => uint256) public gmBurstDay;
    /// @notice Completed GM bursts today (full 10-fragment waves).
    mapping(address => uint256) public gmBurstsToday;
    /// @notice Next fragment index required (0..9) for the in-progress wave.
    mapping(address => uint8) public gmNextFragment;

    /// @notice 0 = none, 1 = for, 2 = against
    mapping(uint256 => mapping(address => uint8)) public userVoteSide;

    event GMSignal(address indexed user, uint256 timestamp, uint8 pulseIndex);
    event VoteCast(
        address indexed voter,
        uint256 indexed chamberId,
        bool support,
        uint256 voteWeight,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 newPresenceScore
    );

    constructor() {
        _addChamber(
            "Institutional FX Liquidity Program",
            "Institutional FX liquidity program parameters for Arc Testnet governance."
        );
        _addChamber(
            "Adjust Stability Fee",
            "Proposal to adjust stability fee calibration across protocol markets."
        );
    }

    function _addChamber(string memory title, string memory description) internal {
        chamberCount += 1;
        uint256 id = chamberCount;
        _chambers[id] = Chamber({
            id: id,
            title: title,
            description: description,
            forVotes: 0,
            againstVotes: 0
        });
    }

    function getChamber(uint256 chamberId) external view returns (Chamber memory) {
        require(chamberId > 0 && chamberId <= chamberCount, "ARC//_INVALID_CHAMBER_ID");
        return _chambers[chamberId];
    }

    /// @dev Voting weight from ARC CORE tiers (basis points scale: 100 = 1.0x).
    function voteWeight(address account) public view returns (uint256) {
        uint256 s = presenceScore[account];
        if (s <= 100) return 100;
        if (s <= 400) return 120;
        if (s <= 800) return 150;
        return 200;
    }

    /// @notice One fragment of a SAY GM wave. Call with indices 0,1,…,9 in order (can resume if a tx fails).
    function emitGmFragment(uint8 fragment) external {
        _emitGmFragment(msg.sender, fragment);
    }

    function _emitGmFragment(address user, uint8 fragment) internal {
        require(fragment < uint8(GM_FRAGMENTS_PER_BURST), "ARC//_INVALID_GM_FRAGMENT");

        uint256 day = block.timestamp / 1 days;
        if (gmBurstDay[user] != day) {
            gmBurstDay[user] = day;
            gmBurstsToday[user] = 0;
            gmNextFragment[user] = 0;
        }

        require(gmBurstsToday[user] < MAX_GM_BURSTS_PER_DAY, "ARC//_DAILY_GM_CAP");
        require(fragment == gmNextFragment[user], "ARC//_FRAG_ORDER");

        emit GMSignal(user, block.timestamp, fragment);

        gmNextFragment[user] = fragment + 1;
        if (gmNextFragment[user] == uint8(GM_FRAGMENTS_PER_BURST)) {
            gmNextFragment[user] = 0;
            unchecked {
                gmBurstsToday[user] += 1;
            }
            presenceScore[user] += PRESENCE_PER_BURST;
        }
    }

    /// @notice One wallet signature: completes the current GM wave (all remaining fragments 0–9).
    function emitGmBurst() external {
        uint8 start = gmNextFragment[msg.sender];
        for (uint8 i = start; i < uint8(GM_FRAGMENTS_PER_BURST); ) {
            _emitGmFragment(msg.sender, i);
            unchecked {
                ++i;
            }
        }
    }

    function vote(uint256 chamberId, bool support) external {
        require(chamberId > 0 && chamberId <= chamberCount, "ARC//_INVALID_CHAMBER_ID");
        require(userVoteSide[chamberId][msg.sender] == 0, "ARC//_DOUBLE_VOTE_BLOCKED");

        uint256 w = voteWeight(msg.sender);
        userVoteSide[chamberId][msg.sender] = support ? uint8(1) : uint8(2);
        Chamber storage c = _chambers[chamberId];
        if (support) {
            c.forVotes += w;
        } else {
            c.againstVotes += w;
        }
        unchecked {
            presenceScore[msg.sender] += PRESENCE_PER_VOTE;
        }
        emit VoteCast(msg.sender, chamberId, support, w, c.forVotes, c.againstVotes, presenceScore[msg.sender]);
    }
}
