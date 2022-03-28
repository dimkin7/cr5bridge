import * as dotenv from "dotenv";
import { ContractJSON } from "ethereum-waffle/dist/esm/ContractJSON";
import { Contract } from "ethers";
import { HardhatUserConfig, task } from "hardhat/config";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";

dotenv.config();

const DimaBridge_Rinkeby = '0xba882EAd1A4E6E753311Ee817E9F244765E0B82b';
const DimaBridge_BinanceTestnet = '0x17A3D1A545cDFc7b35c6a6418D0d575b5F7dE202';


//npx hardhat swap --network binance_testnet --token "Dima_ERC20_2022.03.27" --receiver "0x168668901df7B846Da3cA4A199bb1C41DFC3aCDE" --chainto 4 --amount 25000000000000000000
task("swap", "swap")
  .addParam("token", "Token symbol")
  .addParam("receiver", "receiver")
  .addParam("chainto", "chainTo")
  .addParam("amount", "Amount")
  .setAction(async (taskArgs, hre) => {
    const network = await hre.ethers.provider.getNetwork();
    let bridgeAddr: string = "";
    let mnemonicPath: string = "";

    //set address of Bridge
    if (network.chainId == 4) {
      bridgeAddr = DimaBridge_Rinkeby;
      mnemonicPath = "m/44'/60'/0'/0/2"; //третий акк для Ринкеби
    }
    else if (network.chainId == 97) {
      bridgeAddr = DimaBridge_BinanceTestnet;
      mnemonicPath = "m/44'/60'/0'/0/3"; //четвертый для Бинанса
    }
    const bridge = await hre.ethers.getContractAt("DimaBridge", bridgeAddr);

    let sender = hre.ethers.Wallet.fromMnemonic(String(process.env.MNEMONIC), mnemonicPath);
    console.log('sender: ', sender.address);
    const provider = getProvider(network.chainId, hre);
    if (provider == undefined)
      return;
    sender = sender.connect(provider);

    //function function swap(string memory tokenSymbol, address to, uint256 chainTo, uint256 amount)
    let success = await bridge.connect(sender).swap(taskArgs.token, taskArgs.receiver, taskArgs.chainto, taskArgs.amount);
    console.log('result: ', success);
  });


//npx hardhat sign 
task("sign", "sign transaction")
  .setAction(async (taskArgs, hre) => {
    //this is from event  https://testnet.bscscan.com/address/0x17A3D1A545cDFc7b35c6a6418D0d575b5F7dE202#events
    const from: string = "0x54b645581C078b7c31F9115D7d3ad1e4b0614bF9";
    const chainFrom = 97;
    const to: string = "0x168668901df7B846Da3cA4A199bb1C41DFC3aCDE";
    const chainTo = 4;
    const tokenSymbol = "Dima_ERC20_2022.03.27";
    const amount = hre.ethers.utils.parseUnits("25.0", 18);
    const nonce = 1;

    let backendService = hre.ethers.Wallet.fromMnemonic(String(process.env.MNEMONIC), "m/44'/60'/0'/0/1");  //второй акк
    console.log('backendService: ', backendService.address);

    //calc signature
    const signedDataHash = hre.ethers.utils.solidityKeccak256(
      ["address", "uint256", "address", "uint256", "string", "uint256", "uint256"],
      [from, chainFrom, to, chainTo, tokenSymbol, amount, nonce]
    );

    const bytesArray = hre.ethers.utils.arrayify(signedDataHash);
    const flatSignature = await backendService.signMessage(bytesArray);
    const signature = hre.ethers.utils.splitSignature(flatSignature);

    // here are v, r and s - components of single EC digital signature
    console.log("v:", signature.v);
    console.log("r:", signature.r);
    console.log("s:", signature.s);

    //output:
    // backendService: 0x21a005baEA890D336e81B8F18425080E84c83881
    // v: 28
    // r: 0x2e9ebb817a69ba97a3263688e524c194692811264dd5784feec010e37f925a54
    // s: 0x28e4bd8e45c345f12d605784605a7185542a6710a0e9c409e5ea6b2cdc830533    
  });


//npx hardhat redeem --network rinkeby --from "0x54b645581C078b7c31F9115D7d3ad1e4b0614bF9" --chainfrom 97 --to "0x168668901df7B846Da3cA4A199bb1C41DFC3aCDE" --chainto 4 --token "Dima_ERC20_2022.03.27" --amount 25000000000000000000 --nonce 1 --v 28 --r 0x2e9ebb817a69ba97a3263688e524c194692811264dd5784feec010e37f925a54 --s 0x28e4bd8e45c345f12d605784605a7185542a6710a0e9c409e5ea6b2cdc830533
task("redeem", "redeem")
  .addParam("from", "from")
  .addParam("chainfrom", "chainFrom")
  .addParam("to", "Address to")
  .addParam("chainto", "chainTo")
  .addParam("token", "Token symbol")
  .addParam("amount", "Amount")
  .addParam("nonce", "nonce")
  .addParam("v", "v")
  .addParam("r", "r")
  .addParam("s", "s")
  .setAction(async (taskArgs, hre) => {
    const network = await hre.ethers.provider.getNetwork();
    let bridgeAddr: string = "";
    let mnemonicPath: string = "";

    //set address of Bridge
    if (network.chainId == 4) {
      bridgeAddr = DimaBridge_Rinkeby;
      mnemonicPath = "m/44'/60'/0'/0/2"; //третий акк для Ринкеби
    }
    else if (network.chainId == 97) {
      bridgeAddr = DimaBridge_BinanceTestnet;
      mnemonicPath = "m/44'/60'/0'/0/3"; //четвертый для Бинанса
    }
    const bridge = await hre.ethers.getContractAt("DimaBridge", bridgeAddr);

    let receiver = hre.ethers.Wallet.fromMnemonic(String(process.env.MNEMONIC), mnemonicPath);
    console.log('receiver: ', receiver.address);


    const provider = getProvider(network.chainId, hre);
    if (provider == undefined)
      return;
    receiver = receiver.connect(provider);

    //function redeem(address from, uint256 chainFrom, address to, uint256 chainTo, string memory tokenSymbol, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s )
    let success = await bridge.connect(receiver).redeem(taskArgs.from, taskArgs.chainfrom, taskArgs.to, taskArgs.chainto, taskArgs.token, taskArgs.amount, taskArgs.nonce, taskArgs.v, taskArgs.r, taskArgs.s);
    console.log('result: ', success);
  });


function getProvider(chainId: number, hre: any): Provider | undefined {
  let provider: Provider;
  if (chainId == 4) {
    provider = new hre.ethers.providers.AlchemyProvider("rinkeby");
  }
  else if (chainId == 97) {
    provider = new hre.ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545', { name: 'binance_testnet', chainId: chainId })
  }
  else {
    console.log('Error in getting provider');
    return;
  }
  return provider;
}