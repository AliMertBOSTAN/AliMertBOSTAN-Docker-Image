// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract SimplePriceOracle is Ownable, AccessControl {
	uint256 public price;
    address[] public registeredWallets;


	event PriceUpdated(uint256 newPrice);

	constructor(address initialOwner, uint256 initialPrice) Ownable(initialOwner) {
		price = initialPrice;
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
	}

    function grantControlRole(address account) public onlyOwner {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

	function setPrice(uint256 newPrice) external onlyOwner {
		price = newPrice;
		emit PriceUpdated(newPrice);
	}

    function getPrice() external view returns (uint256) {
        return price;
    }

    function registerWallet(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registeredWallets.push(wallet);
    }

    function isWalletRegistered(address wallet) external view returns (bool) {
        for (uint256 i = 0; i < registeredWallets.length; i++) {
            if (registeredWallets[i] == wallet) {
                return true;
            }
        }
        return false;
    }
}
