import { ethers, config } from "hardhat";

async function main() {
  const SIGNER_ADDRESS = "0x21a005baEA890D336e81B8F18425080E84c83881"; //это второй адрес из мнемоника, он будет для подписи, третий - для rinkeby,  четвертый для binance_testnet
  const network = await ethers.provider.getNetwork();

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  //deploy ERC20
  const factoryERC20 = await ethers.getContractFactory("DimaERC20");
  const contractERC20 = await factoryERC20.deploy("Dima ERC20 2022.03.27", "Dima_ERC20_2022.03.27", ethers.utils.parseUnits("10000.0", 18));
  await contractERC20.deployed();
  console.log(await contractERC20.symbol(), contractERC20.address);

  const factoryBridge = await ethers.getContractFactory("DimaBridge");

  // deploy Bridge
  const contractBridge = await factoryBridge.deploy(network.chainId);
  await contractBridge.deployed();
  console.log("DimaBridge:", contractBridge.address, "chainId:", network.chainId);


  //записываем в токены адрес моста
  let success = await contractERC20.addBridge(contractBridge.address);
  console.log('addBridge: ', success);

  success = await contractBridge.addToken(contractERC20.address);
  console.log('addToken: ', success);

  success = await contractBridge.addSigner(SIGNER_ADDRESS);
  console.log('addSigner: ', success);
}

// run
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
