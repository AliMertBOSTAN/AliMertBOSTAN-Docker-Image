// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20FlashMint} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

interface IPriceOracle {
    function registerWallet(address wallet) external;
    function isWalletRegistered(address wallet) external view returns (bool);
}

contract MERT is ERC20, Ownable, ERC20Permit, ERC20FlashMint {
    bool public transferOnlyKYC;
    IPriceOracle public priceOracle;

    constructor(address initialOwner) ERC20("MERT", "MRT") Ownable(initialOwner) ERC20Permit("MERT") {
        transferOnlyKYC = false;
    }

    modifier checkKYC(address to) {
        if(transferOnlyKYC) {
            require(priceOracle.isWalletRegistered(msg.sender), "Sender is not registered");
            require(priceOracle.isWalletRegistered(to), "Recipient is not registered");
        }
        _;
    }

    function setTransferOnlyKYC(bool _enabled) public onlyOwner {
        transferOnlyKYC = _enabled;
    }

    function setPriceOracle(address _priceOracle) public onlyOwner {
        priceOracle = IPriceOracle(_priceOracle);
    }

    function registerWallet() public {
        IPriceOracle(priceOracle).registerWallet(msg.sender);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public override checkKYC(to) returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override checkKYC(to) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

}
