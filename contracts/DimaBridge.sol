// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol"; //TODO удалить
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface ERC20forBridge is IERC20Metadata {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}

contract DimaBridge is AccessControl {
    //using SafeERC20 for IERC20;
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    uint256 public mChainID;
    //address public mTokenAddr;
    //string public mTokenSymbol;
    ERC20forBridge private mERC20;
    Counters.Counter private mCounter;
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    //hash was processed
    mapping(bytes32 => bool) private mRedeemDone;

    event SwapInitialized(
        address from,
        uint256 chainFrom,
        address to,
        uint256 chainTo,
        uint256 amount,
        uint256 nonce
    );
    event RedeemDone(address to, uint256 amount, uint256 nonce);

    constructor(uint256 chainID) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        mChainID = chainID;
    }

    //burns tokens from the user, emits event
    function swap(
        address to,
        uint256 chainTo,
        uint256 amount
    ) public {
        mERC20.burn(msg.sender, amount);

        mCounter.increment();

        //TODO - символ токена? Пока мост для одного токена

        //event for Backend service
        //from = msg.sender
        //chainFrom = block.chainid
        emit SwapInitialized(
            msg.sender,
            block.chainid,
            to,
            chainTo,
            amount,
            mCounter.current() //nonce
        );
    }

    //message consist of fields: to,amount,nonce
    //signature consist of fields: v,r,s
    function redeem(
        address to,
        uint256 amount,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        //get hash of message
        bytes32 signedDataHash = keccak256(abi.encodePacked(to, amount, nonce));
        bytes32 message = signedDataHash.toEthSignedMessageHash();
        //Checking that the message has not been processed
        require(!mRedeemDone[message], "Replay attack prevented");

        //get and check the signer with ecrecover
        address signer = message.recover(v, r, s);
        require(hasRole(SIGNER_ROLE, signer), "<censored>: invalid sig");

        //mint tokens, save message and emit event
        mERC20.mint(to, amount);
        mRedeemDone[message] = true;
        emit RedeemDone(to, amount, nonce);
    }

    //TODO пока для простоты токен будет один
    function setToken(address tokenAddr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        mERC20 = ERC20forBridge(tokenAddr);
        //console.log(mERC20.symbol());
    }

    function setSigner(address signerAddr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(SIGNER_ROLE, signerAddr);
    }
}
