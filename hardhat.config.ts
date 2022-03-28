import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";

import "@nomiclabs/hardhat-ethers";

import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
//tasks
require("./tasks/task.ts");

dotenv.config();


const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {

    rinkeby: {
      chainId: 4,
      url: process.env.RENKEBY_URL || '',
      //accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      accounts: { mnemonic: process.env.MNEMONIC, }
    },

    binance_testnet: {
      chainId: 97,
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: { mnemonic: process.env.MNEMONIC, }
    },


    //workaround for coverage error: InvalidInputError: Transaction gasPrice (1) is too low for the next block, which has a baseFeePerGas of 875000000
    hardhat: {
      initialBaseFeePerGas: 0
    },

  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    //apiKey: process.env.ETHERSCAN_API_KEY,
    apiKey: process.env.BSCSCAN_API_KEY,
  },

};

export default config;
