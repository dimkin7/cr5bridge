// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DimaERC20 is ERC20, AccessControl {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addBridge(address bridge) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(BRIDGE_ROLE, bridge);
    }

    function removeBridge(address bridge) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(BRIDGE_ROLE, bridge);
    }

    function mint(address to, uint256 amount) public onlyRole(BRIDGE_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(BRIDGE_ROLE) {
        _burn(from, amount);
    }
}
