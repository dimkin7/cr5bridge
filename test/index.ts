import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Bridge", function () {
  let erc20_1: Contract;
  let erc20_2: Contract;
  let bridge_1: Contract;
  let bridge_2: Contract;
  let owner: SignerWithAddress;
  let backendService: SignerWithAddress;
  let sender: SignerWithAddress;
  let receiver: SignerWithAddress;
  const chainId1 = 31337;
  const chainId2 = 202;
  let amount = ethers.utils.parseUnits("15.0", 18);
  let nonce = 1;

  before(async function () {
    [owner, backendService, sender, receiver] = await ethers.getSigners();

    //create erc20
    const factoryERC20 = await ethers.getContractFactory("DimaERC20");
    erc20_1 = await factoryERC20.deploy(ethers.utils.parseUnits("300.0", 18));
    await erc20_1.deployed();
    erc20_2 = await factoryERC20.deploy(ethers.utils.parseUnits("400.0", 18));
    await erc20_2.deployed();

    //create Bridge
    const factoryBridge = await ethers.getContractFactory("DimaBridge");
    bridge_1 = await factoryBridge.deploy(chainId1);
    await bridge_1.deployed();
    bridge_2 = await factoryBridge.deploy(chainId2);
    await bridge_2.deployed();

    //add tokens to sender
    erc20_1.transfer(sender.address, ethers.utils.parseUnits("100.0", 18));
  });

  it("setToken, setBridge", async function () {
    await bridge_1.setToken(erc20_1.address);
    await erc20_1.setBridge(bridge_1.address);

    await bridge_2.setToken(erc20_2.address);
    await erc20_2.setBridge(bridge_2.address);

    await bridge_2.setSigner(backendService.address);
  });


  it("swap", async function () {
    expect(await erc20_1.balanceOf(sender.address)).to.equal(ethers.utils.parseUnits("100.0", 18));
    //swap(address to, uint256 chainTo, uint256 amount)
    await expect(bridge_1.connect(sender).swap(receiver.address, chainId2, amount))
      .to.emit(bridge_1, "SwapInitialized")
      .withArgs(sender.address, chainId1, receiver.address, chainId2, amount, nonce);

    expect(await erc20_1.balanceOf(sender.address)).to.equal(ethers.utils.parseUnits("85.0", 18));
  });

  it("redeem", async function () {
    const signedDataHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [receiver.address, amount, nonce]
    );
    // At this step we are making ethers to treat data as bytes array,
    // not string
    const bytesArray = ethers.utils.arrayify(signedDataHash);
    const flatSignature = await backendService.signMessage(bytesArray);

    // We signed everything, but before knocking contract, we have to
    // split signature into 3 different components - v, r, s.
    const signature = ethers.utils.splitSignature(flatSignature);

    // here are v, r and s - components of single EC digital signature
    //console.log(signature.v, signature.r, signature.s);

    expect(await erc20_2.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("0.0", 18));

    //function redeem( address to, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s)
    await bridge_2.connect(receiver).redeem(receiver.address, amount, nonce, signature.v, signature.r, signature.s);

    expect(await erc20_2.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("15.0", 18));
  });
});
