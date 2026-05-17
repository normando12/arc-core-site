// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Mint/burn ERC-20 demo token — only BobbieMultiSwap may mint or burnFromHolder.
contract MockSwapToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public immutable owner;
    address public swap;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function setSwap(address s) external {
        require(msg.sender == owner && swap == address(0), "ARC//_SWAP_SET");
        swap = s;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == swap, "ARC//_MINT_AUTH");
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }

    function burnFromHolder(address holder, uint256 amount) external {
        require(msg.sender == swap, "ARC//_BURN_AUTH");
        require(balanceOf[holder] >= amount, "ARC//_BAL");
        unchecked {
            balanceOf[holder] -= amount;
            totalSupply -= amount;
        }
        emit Transfer(holder, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "ARC//_ALLOWANCE");
        unchecked {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "ARC//_BAL");
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
