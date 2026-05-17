// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Pull {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IMintBurn {
    function mint(address to, uint256 amount) external;
    function burnFromHolder(address holder, uint256 amount) external;
}

/// @notice Fixed-rate multi-asset swap on Arc Testnet: USDC/EURC pools + ARC/ETH/WBTC demo mint/burn.
/// @dev Token ids: 0=USDC, 1=EURC, 2=ARC, 3=ETH, 4=WBTC. Rates match app preview (lib/bobbie-swap.ts).
contract BobbieMultiSwap {
    uint8 public constant ID_USDC = 0;
    uint8 public constant ID_EURC = 1;
    uint8 public constant ID_ARC = 2;
    uint8 public constant ID_ETH = 3;
    uint8 public constant ID_WBTC = 4;

    IERC20Pull public immutable usdc;
    IERC20Pull public immutable eurc;
    IMintBurn public immutable arcToken;
    IMintBurn public immutable ethToken;
    IMintBurn public immutable wbtcToken;

    struct Rate {
        uint256 num;
        uint256 den;
    }

    mapping(uint8 => mapping(uint8 => Rate)) public rates;

    event SwapPair(address indexed user, uint8 indexed fromId, uint8 indexed toId, uint256 amountIn, uint256 amountOut);

    constructor(
        address _usdc,
        address _eurc,
        address _arc,
        address _eth,
        address _wbtc
    ) {
        require(_usdc != address(0) && _eurc != address(0), "ARC//_ZERO_ADDR");
        require(_arc != address(0) && _eth != address(0) && _wbtc != address(0), "ARC//_ZERO_ADDR");
        usdc = IERC20Pull(_usdc);
        eurc = IERC20Pull(_eurc);
        arcToken = IMintBurn(_arc);
        ethToken = IMintBurn(_eth);
        wbtcToken = IMintBurn(_wbtc);
        _initRates();
    }

    function _initRates() internal {
        // USDC out
        _setRate(ID_USDC, ID_ARC, 684, 1000);
        _setRate(ID_USDC, ID_EURC, 926, 1000);
        _setRate(ID_USDC, ID_ETH, 2172, 10_000_000);
        _setRate(ID_USDC, ID_WBTC, 112, 10_000_000);
        // EURC out
        _setRate(ID_EURC, ID_USDC, 108, 100);
        _setRate(ID_EURC, ID_ARC, 74, 100);
        _setRate(ID_EURC, ID_ETH, 234, 1_000_000);
        _setRate(ID_EURC, ID_WBTC, 121, 10_000_000);
        // ARC out
        _setRate(ID_ARC, ID_USDC, 14626, 10_000);
        _setRate(ID_ARC, ID_EURC, 1351, 1000);
        _setRate(ID_ARC, ID_ETH, 3175, 10_000_000);
        _setRate(ID_ARC, ID_WBTC, 164, 10_000_000);
        // ETH out
        _setRate(ID_ETH, ID_ARC, 3158, 1);
        _setRate(ID_ETH, ID_USDC, 4624, 1);
        _setRate(ID_ETH, ID_EURC, 4274, 1);
        _setRate(ID_ETH, ID_WBTC, 516, 10_000);
        // WBTC out
        _setRate(ID_WBTC, ID_ARC, 98140, 1);
        _setRate(ID_WBTC, ID_USDC, 143650, 1);
        _setRate(ID_WBTC, ID_EURC, 132870, 1);
        _setRate(ID_WBTC, ID_ETH, 1962, 100);
    }

    function _setRate(uint8 fromId, uint8 toId, uint256 num, uint256 den) internal {
        require(fromId != toId && num > 0 && den > 0, "ARC//_RATE");
        rates[fromId][toId] = Rate({num: num, den: den});
    }

    function _decimals(uint8 id) internal pure returns (uint8) {
        if (id == ID_USDC || id == ID_EURC) return 6;
        if (id == ID_WBTC) return 8;
        return 18;
    }

    function _isMintable(uint8 id) internal pure returns (bool) {
        return id >= ID_ARC;
    }

    function quoteOut(uint8 fromId, uint8 toId, uint256 amountIn) public view returns (uint256) {
        if (amountIn == 0 || fromId == toId) return 0;
        Rate memory r = rates[fromId][toId];
        require(r.den > 0, "ARC//_PAIR");
        uint8 inDec = _decimals(fromId);
        uint8 outDec = _decimals(toId);
        if (outDec >= inDec) {
            uint256 upScale = 10 ** uint256(outDec - inDec);
            return (amountIn * r.num * upScale) / r.den;
        }
        uint256 downScale = 10 ** uint256(inDec - outDec);
        return (amountIn * r.num) / (r.den * downScale);
    }

    function swap(uint8 fromId, uint8 toId, uint256 amountIn, uint256 minOut) external {
        _swap(fromId, toId, amountIn, minOut);
    }

    function _swap(uint8 fromId, uint8 toId, uint256 amountIn, uint256 minOut) internal {
        require(amountIn > 0 && fromId != toId, "ARC//_ZERO_IN");
        uint256 amountOut = quoteOut(fromId, toId, amountIn);
        require(amountOut >= minOut && amountOut > 0, "ARC//_SLIPPAGE");
        _pull(fromId, msg.sender, amountIn);
        _push(toId, msg.sender, amountOut);
        emit SwapPair(msg.sender, fromId, toId, amountIn, amountOut);
    }

    function _pull(uint8 id, address user, uint256 amount) internal {
        if (id == ID_USDC) {
            require(usdc.transferFrom(user, address(this), amount), "ARC//_PULL");
            return;
        }
        if (id == ID_EURC) {
            require(eurc.transferFrom(user, address(this), amount), "ARC//_PULL");
            return;
        }
        if (id == ID_ARC) {
            arcToken.burnFromHolder(user, amount);
            return;
        }
        if (id == ID_ETH) {
            ethToken.burnFromHolder(user, amount);
            return;
        }
        wbtcToken.burnFromHolder(user, amount);
    }

    function _push(uint8 id, address user, uint256 amount) internal {
        if (id == ID_USDC) {
            require(usdc.transfer(user, amount), "ARC//_PUSH");
            return;
        }
        if (id == ID_EURC) {
            require(eurc.transfer(user, amount), "ARC//_PUSH");
            return;
        }
        if (id == ID_ARC) {
            arcToken.mint(user, amount);
            return;
        }
        if (id == ID_ETH) {
            ethToken.mint(user, amount);
            return;
        }
        wbtcToken.mint(user, amount);
    }

    // --- Legacy BobbieArcSwap API (USDC ↔ ARC) ---

    function quoteArcOut(uint256 usdcAmount) external view returns (uint256) {
        return quoteOut(ID_USDC, ID_ARC, usdcAmount);
    }

    function quoteUsdcOut(uint256 arcAmount) external view returns (uint256) {
        return quoteOut(ID_ARC, ID_USDC, arcAmount);
    }

    function swapUsdcForArc(uint256 usdcAmount, uint256 minArcOut) external {
        _swap(ID_USDC, ID_ARC, usdcAmount, minArcOut);
    }

    function swapArcForUsdc(uint256 arcAmount, uint256 minUsdcOut) external {
        _swap(ID_ARC, ID_USDC, arcAmount, minUsdcOut);
    }
}
