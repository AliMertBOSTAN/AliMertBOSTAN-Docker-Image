// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


interface IPriceOracle {
    function registerWallet(address wallet) external;
    function isWalletRegistered(address wallet) external view returns (bool);
    function price() external view returns (uint256);
}

contract TokenSale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable trb;
    IERC20 public immutable token;
    IPriceOracle public priceOracle;

    uint8 private immutable tokenDecimals;

    event TokensPurchased(
        address indexed buyer,
        address indexed receiver,
        uint256 trbPaid,
        uint256 tokensBought,
        uint256 price
    );

    event TokensSold(
        address indexed seller,
        address indexed receiver,
        uint256 tokensSold,
        uint256 trbReceived,
        uint256 price
    );

    constructor(address initialOwner, address trb_, address token_, address oracle_) Ownable(initialOwner) {
        require(trb_ != address(0), "TRB address zero");
        require(token_ != address(0), "Token address zero");
        trb = IERC20(trb_);
        token = IERC20(token_);
        tokenDecimals = IERC20Metadata(token_).decimals();
        _setOracle(oracle_);
    }

    function setOracle(address oracle_) external onlyOwner {
        _setOracle(oracle_);
    }

    function buy(uint256 trbAmount, address receiver) external nonReentrant returns (uint256 tokensOut) {
        require(trbAmount > 0, "Amount is zero");
        _requireKYC(msg.sender);
        _requireKYC(receiver);

        uint256 p = _getPrice();
        tokensOut = _quote(trbAmount, p);
        require(tokensOut > 0, "Amount too small");

        trb.safeTransferFrom(msg.sender, address(this), trbAmount);
        token.safeTransfer(receiver, tokensOut);

        emit TokensPurchased(msg.sender, receiver, trbAmount, tokensOut, p);
    }
    
    function sell(uint256 tokenAmount, address receiver) external nonReentrant returns (uint256 trbOut) {
        require(tokenAmount > 0, "Amount is zero");
        _requireKYC(msg.sender);
        _requireKYC(receiver);

        uint256 p = _getPrice();
        trbOut = _quoteReverse(tokenAmount, p);
        require(trbOut > 0, "Amount too small");

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        trb.safeTransfer(receiver, trbOut);

        emit TokensSold(msg.sender, receiver, tokenAmount, trbOut, p);
    }

    function previewBuy(uint256 trbAmount) external view returns (uint256 tokensOut) {
        if (trbAmount == 0) return 0;
        tokensOut = _quote(trbAmount, _getPrice());
    }

    function previewSell(uint256 tokenAmount) external view returns (uint256 trbOut) {
        if (tokenAmount == 0) return 0;
        trbOut = _quoteReverse(tokenAmount, _getPrice());
    }

    function _quote(uint256 trbAmount, uint256 price_) private view returns (uint256 tokensOut) {
        uint256 tokenScale = 10 ** tokenDecimals;
        tokensOut = (trbAmount * tokenScale) / price_;
    }

    function _quoteReverse(uint256 tokenAmount, uint256 price_) private view returns (uint256 trbOut) {
        uint256 tokenScale = 10 ** tokenDecimals;
        trbOut = (tokenAmount * price_) / tokenScale;
    }

    function _requireKYC(address account) private view {
        require(address(priceOracle) != address(0), "Oracle not set");
        require(priceOracle.isWalletRegistered(account), "Not KYC-approved");
    }

    function _getPrice() private view returns (uint256) {
        require(address(priceOracle) != address(0), "Oracle not set");
        uint256 p = priceOracle.price();
        require(p > 0, "Oracle price zero");
        return p;
    }

    function _setOracle(address oracle_) private {
        require(oracle_ != address(0), "Oracle address zero");
        priceOracle = IPriceOracle(oracle_);
    }
}
