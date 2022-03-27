// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface ERC20forBridge is IERC20Metadata {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}

contract DimaBridge is AccessControl {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    uint256 public mChainID;
    Counters.Counter private mCounter;
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    //message was processed (hash => bool)
    mapping(bytes32 => bool) private mRedeemDone;
    //tokens to swap (symbol => token address)
    mapping(string => address) private mTokens;

    event SwapInitialized(
        address from,
        uint256 chainFrom,
        address to,
        uint256 chainTo,
        string tokenSymbol,
        uint256 amount,
        uint256 nonce
    );
    event RedeemDone(
        address from,
        uint256 chainFrom,
        address to,
        uint256 chainTo,
        string tokenSymbol,
        uint256 amount,
        uint256 nonce
    );

    constructor(uint256 chainID) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        mChainID = chainID;
    }

    //burns tokens from the user, emits event
    function swap(
        string memory tokenSymbol,
        address to,
        uint256 chainTo,
        uint256 amount
    ) public {
        //console.log(tokenSymbol);
        address tokenAddress = mTokens[tokenSymbol];
        require(tokenAddress != address(0), "Unknown tokenSymbol");
        ERC20forBridge token = ERC20forBridge(tokenAddress);

        token.burn(msg.sender, amount);

        mCounter.increment();

        //event for Backend service
        //from = msg.sender
        emit SwapInitialized(
            msg.sender,
            mChainID,
            to,
            chainTo,
            tokenSymbol,
            amount,
            mCounter.current() //nonce
        );
    }

    //message consist of all fields of the event SwapInitialized
    //signature consist of fields: v,r,s
    function redeem(
        address from,
        uint256 chainFrom,
        address to,
        uint256 chainTo,
        string memory tokenSymbol,
        uint256 amount,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        //prevent attack
        require(chainTo == mChainID, "Wrong chainTo");
        address tokenAddress = mTokens[tokenSymbol];
        require(tokenAddress != address(0), "Unknown tokenSymbol");
        ERC20forBridge token = ERC20forBridge(tokenAddress);

        //get hash of message
        bytes32 signedDataHash = keccak256(
            abi.encodePacked(
                from,
                chainFrom,
                to,
                chainTo,
                tokenSymbol,
                amount,
                nonce
            )
        );
        bytes32 message = signedDataHash.toEthSignedMessageHash();
        //Checking that the message has not been processed
        require(!mRedeemDone[message], "Replay attack prevented");

        //get and check the signer with ecrecover
        address signer = message.recover(v, r, s);
        require(hasRole(SIGNER_ROLE, signer), "<censored>: invalid sig");

        //mint tokens, save message and emit event
        token.mint(to, amount);
        mRedeemDone[message] = true;
        emit RedeemDone(
            from,
            chainFrom,
            to,
            chainTo,
            tokenSymbol,
            amount,
            nonce
        );
    }

    function addToken(address tokenAddr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ERC20forBridge token = ERC20forBridge(tokenAddr);
        address tokenAddress = mTokens[token.symbol()];
        require(tokenAddress == address(0), "Token symbol already exist");
        mTokens[token.symbol()] = tokenAddr;
    }

    function removeToken(address tokenAddr)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        ERC20forBridge token = ERC20forBridge(tokenAddr);
        address tokenAddress = mTokens[token.symbol()];
        require(tokenAddress != address(0), "The token does not exist.");
        delete mTokens[token.symbol()];
    }

    function addSigner(address signerAddr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(SIGNER_ROLE, signerAddr);
    }

    function removeSigner(address signerAddr)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(SIGNER_ROLE, signerAddr);
    }
}
