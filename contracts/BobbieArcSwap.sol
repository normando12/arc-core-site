// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Pull {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IMintBurnArc {
    function mint(address to, uint256 amount) external;
    function burnFromHolder(address holder, uint256 amount) external;
}

/// @notice Pulls native USDC (6 decimals), mints ARC demo tokens (18 decimals) at a fixed rate.
/// @dev Rate matches app preview: arcOut = usdcAmount * rateNum * 1e12 / rateDen for 6→18 decimal scale.
contract BobbieArcSwap {
    IERC20Pull public immutable usdc;
    IMintBurnArc public immutable arcToken;
    uint256 public immutable rateNum;
    uint256 public immutable rateDen;

    event Swap(address indexed user, uint256 usdcIn, uint256 arcOut);
    event SwapReverse(address indexed user, uint256 arcIn, uint256 usdcOut);

    constructor(address _usdc, address _arc, uint256 _rateNum, uint256 _rateDen) {
        require(_usdc != address(0) && _arc != address(0), "ARC//_ZERO_ADDR");
        require(_rateNum > 0 && _rateDen > 0, "ARC//_RATE");
        usdc = IERC20Pull(_usdc);
        arcToken = IMintBurnArc(_arc);
        rateNum = _rateNum;
        rateDen = _rateDen;
    }

    function quoteArcOut(uint256 usdcAmount) external view returns (uint256) {
        if (usdcAmount == 0) return 0;
        return (usdcAmount * rateNum * 1e12) / rateDen;
    }

    function swapUsdcForArc(uint256 usdcAmount, uint256 minArcOut) external {
        require(usdcAmount > 0, "ARC//_ZERO_IN");
        uint256 arcOut = (usdcAmount * rateNum * 1e12) / rateDen;
        require(arcOut >= minArcOut, "ARC//_SLIPPAGE");
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "ARC//_USDC_PULL");
        arcToken.mint(msg.sender, arcOut);
        emit Swap(msg.sender, usdcAmount, arcOut);
    }

    /// @dev Inverse of quoteArcOut: usdcOut = arcAmount * rateDen / (rateNum * 1e12).
    function quoteUsdcOut(uint256 arcAmount) external view returns (uint256) {
        if (arcAmount == 0) return 0;
        return (arcAmount * rateDen) / (rateNum * 1e12);
    }

    function swapArcForUsdc(uint256 arcAmount, uint256 minUsdcOut) external {
        require(arcAmount > 0, "ARC//_ZERO_IN");
        uint256 usdcOut = (arcAmount * rateDen) / (rateNum * 1e12);
        require(usdcOut >= minUsdcOut, "ARC//_SLIPPAGE");
        require(usdcOut > 0, "ARC//_DUST");
        arcToken.burnFromHolder(msg.sender, arcAmount);
        require(usdc.transfer(msg.sender, usdcOut), "ARC//_USDC_PUSH");
        emit SwapReverse(msg.sender, arcAmount, usdcOut);
    }
}
