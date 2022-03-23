// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DimaERC20 is ERC20 {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    constructor(uint256 initialSupply) ERC20("Dima ERC20", "DIMA_ERC20") {
        _mint(msg.sender, initialSupply);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setBridge(address bridge) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(BRIDGE_ROLE, bridge);
    }

    function mint(address to, uint256 amount) public onlyRole(BRIDGE_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(BRIDGE_ROLE) {
        _burn(from, amount);
    }
}
