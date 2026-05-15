// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Pull {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IMintArc {
    function mint(address to, uint256 amount) external;
}

/// @notice Pulls native USDC (6 decimals), mints ARC demo tokens (18 decimals) at a fixed rate.
/// @dev Rate matches app preview: arcOut = usdcAmount * rateNum * 1e12 / rateDen for 6→18 decimal scale.
contract BobbieArcSwap {
    IERC20Pull public immutable usdc;
    IMintArc public immutable arcToken;
    uint256 public immutable rateNum;
    uint256 public immutable rateDen;

    event Swap(address indexed user, uint256 usdcIn, uint256 arcOut);

    constructor(address _usdc, address _arc, uint256 _rateNum, uint256 _rateDen) {
        require(_usdc != address(0) && _arc != address(0), "ARC//_ZERO_ADDR");
        require(_rateNum > 0 && _rateDen > 0, "ARC//_RATE");
        usdc = IERC20Pull(_usdc);
        arcToken = IMintArc(_arc);
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
}
