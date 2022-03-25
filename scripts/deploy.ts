import { ethers } from "hardhat";

async function main() {
  const RINKEBY = 4;
  const BINANCE_TESTNET = 97;
  const SIGNER_ADDRESS = "0x21a005baEA890D336e81B8F18425080E84c83881"; //это второй адрес из мнемоника

  // deploy
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const factoryERC20 = await ethers.getContractFactory("DimaERC20");
  const contractERC20 = await factoryERC20.deploy(ethers.utils.parseUnits("10000.0", 18));
  await contractERC20.deployed();
  console.log("DimaERC20:", contractERC20.address);

  const factoryBridge = await ethers.getContractFactory("DimaBridge");

  const hre = require("hardhat");

  let chainID = BINANCE_TESTNET;  //RINKEBY; - тут при втором деплое поменял
  const contractBridge = await factoryBridge.deploy(chainID);
  await contractBridge.deployed();
  console.log("DimaBridge:", contractBridge.address, "chainID:", chainID);


  //настойка для Бинаса (а для ринкеби было через таски)
  let success = await contractERC20.setBridge(contractBridge.address);
  console.log('setBridge: ', success);

  success = await contractBridge.setToken(contractERC20.address);
  console.log('setToken: ', success);

  success = await contractBridge.setSigner(SIGNER_ADDRESS);
  console.log('setSigner: ', success);
}

// run
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
