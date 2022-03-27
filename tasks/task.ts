import * as dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";

const DimaERC20_Rinkeby = '0x989d1Df0a79e0610389c9a20565d02Ee6EFf2D5A';
const DimaBridge_Rinkeby = '0x049DEE678524934247d0bEeB9a9d22305267c0DD';

const DimaBridge_BinanceTestnet = '0xC561992999F6159C2dc0d050ACcA3b5811039b7b';

const receiver = '0x54b645581C078b7c31F9115D7d3ad1e4b0614bF9';

dotenv.config();

const BINANCE_TESTNET_CHAINID = 97;



//npx hardhat set-token-rinkeby --network rinkeby
task("set-token-rinkeby", "set-token-rinkeby")
  .setAction(async (taskArgs, hre) => {
    const bridge = await hre.ethers.getContractAt("DimaBridge", DimaBridge_Rinkeby);
    let success = await bridge.addToken(DimaERC20_Rinkeby);
    console.log('result: ', success);
  });

//npx hardhat set-bridge-rinkeby --network rinkeby
task("set-bridge-rinkeby", "set-bridge-rinkeby")
  .setAction(async (taskArgs, hre) => {
    const token = await hre.ethers.getContractAt("DimaERC20", DimaERC20_Rinkeby);
    let success = await token.setBridge(DimaBridge_Rinkeby);
    console.log('result: ', success);
  });



//npx hardhat swap --network rinkeby --token "DimaERC20"  --amount 16000000000000000000
task("swap", "set-bridge-rinkeby")
  .addParam("token", "Token symbol")
  .addParam("amount", "Amount")
  .setAction(async (taskArgs, hre) => {
    const bridge = await hre.ethers.getContractAt("DimaBridge", DimaBridge_Rinkeby);
    let sender = hre.ethers.Wallet.fromMnemonic(String(process.env.MNEMONIC), "m/44'/60'/0'/0/2");  //третий акк
    console.log('sender: ', sender.address);
    const provider = new hre.ethers.providers.AlchemyProvider("rinkeby");
    sender = sender.connect(provider);

    //function swap(string memory tokenSymbol, address to, uint256 chainTo, uint256 amount)
    let success = await bridge.connect(sender).swap(taskArgs.token, receiver, BINANCE_TESTNET_CHAINID, taskArgs.amount);
    console.log('result: ', success);
  });


//npx hardhat sign 
task("sign", "sign transaction")
  .setAction(async (taskArgs, hre) => {
    //this is from event  https://rinkeby.etherscan.io/address/0x049DEE678524934247d0bEeB9a9d22305267c0DD#events
    const to: string = "0x54b645581c078b7c31f9115d7d3ad1e4b0614bf9";
    const amount = hre.ethers.utils.parseUnits("16.0", 18);
    const nonce = 1;

    let backendService = hre.ethers.Wallet.fromMnemonic(String(process.env.MNEMONIC), "m/44'/60'/0'/0/1");  //второй акк
    console.log('backendService: ', backendService.address);

    //calc signature
    const signedDataHash = hre.ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [to, amount, nonce]
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
    // v: 27
    // r: 0xe508028c8beae7a3ea229501079f54c88206ca8855c11ab8c277e7a18aef12a3
    // s: 0x4cfb4e4a3a46ce98e9f619a636ae71a360aee5f1efbe15625dad8bfd5809689a
  });


//npx hardhat redeem --network binance_testnet --to "0x54b645581C078b7c31F9115D7d3ad1e4b0614bF9" --amount 16000000000000000000 --nonce 1 --v 27 --r 0xe508028c8beae7a3ea229501079f54c88206ca8855c11ab8c277e7a18aef12a3 --s 0x4cfb4e4a3a46ce98e9f619a636ae71a360aee5f1efbe15625dad8bfd5809689a
task("redeem", "redeem")
  .addParam("from", "from")
  .addParam("chainFrom", "chainFrom")
  .addParam("to", "Address to")
  .addParam("chainTo", "chainTo")
  .addParam("token", "Token symbol")
  .addParam("amount", "Amount")
  .addParam("nonce", "nonce")
  .addParam("v", "v")
  .addParam("r", "r")
  .addParam("s", "s")
  .setAction(async (taskArgs, hre) => {
    const bridge = await hre.ethers.getContractAt("DimaBridge", DimaBridge_BinanceTestnet);
    let receiver = hre.ethers.Wallet.fromMnemonic(String(process.env.MNEMONIC), "m/44'/60'/0'/0/3");  //четвертый акк
    console.log('receiver: ', receiver.address);

    const provider = new hre.ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545', { name: 'binance_testnet', chainId: BINANCE_TESTNET_CHAINID })

    receiver = receiver.connect(provider);

    //function redeem(address from, uint256 chainFrom, address to, uint256 chainTo, string memory tokenSymbol, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s )
    let success = await bridge.connect(receiver).redeem(taskArgs.from, taskArgs.chainFrom, taskArgs.to, taskArgs.chainTo, taskArgs.token, taskArgs.amount, taskArgs.nonce, taskArgs.v, taskArgs.r, taskArgs.s);
    console.log('result: ', success);
  });