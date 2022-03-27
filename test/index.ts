import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signature } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Bridge", function () {
  let erc20_1: Contract;
  let erc20_2: Contract;
  let shib: Contract;
  let bridge_1: Contract;
  let bridge_2: Contract;
  let owner: SignerWithAddress;
  let backendService: SignerWithAddress;
  let sender: SignerWithAddress;
  let receiver: SignerWithAddress;
  const chainId1 = 111;
  const chainId2 = 222;
  const symbol = "DIMA_ERC20"
  let amount = ethers.utils.parseUnits("15.0", 18);
  let nonce = 1;
  let signature: Signature;

  before(async function () {
    [owner, backendService, sender, receiver] = await ethers.getSigners();

    //create erc20
    const factoryERC20 = await ethers.getContractFactory("DimaERC20");
    erc20_1 = await factoryERC20.deploy("Dima token", symbol, ethers.utils.parseUnits("300.0", 18));
    await erc20_1.deployed();
    erc20_2 = await factoryERC20.deploy("Dima token", symbol, ethers.utils.parseUnits("400.0", 18));
    await erc20_2.deployed();
    shib = await factoryERC20.deploy("Shiba Inu", "SHIB", ethers.utils.parseUnits("500.0", 18));
    await shib.deployed();

    //create Bridge
    const factoryBridge = await ethers.getContractFactory("DimaBridge");
    bridge_1 = await factoryBridge.deploy(chainId1);
    await bridge_1.deployed();
    bridge_2 = await factoryBridge.deploy(chainId2);
    await bridge_2.deployed();

    //add tokens to sender
    erc20_1.transfer(sender.address, ethers.utils.parseUnits("100.0", 18));
  });

  it("addToken, addBridge", async function () {
    await bridge_1.addToken(erc20_1.address);
    await erc20_1.addBridge(bridge_1.address);

    await bridge_2.addToken(erc20_2.address);
    await erc20_2.addBridge(bridge_2.address);

    await bridge_2.addSigner(backendService.address);
  });


  it("swap", async function () {
    expect(await erc20_1.balanceOf(sender.address)).to.equal(ethers.utils.parseUnits("100.0", 18));
    //function swap(string memory tokenSymbol, address to, uint256 chainTo, uint256 amount)
    //event SwapInitialized(address from, uint256 chainFrom, address to, uint256 chainTo, string tokenSymbol, uint256 amount, uint256 nonce);
    await expect(bridge_1.connect(sender).swap(symbol, receiver.address, chainId2, amount))
      .to.emit(bridge_1, "SwapInitialized")
      .withArgs(sender.address, chainId1, receiver.address, chainId2, symbol, amount, nonce);

    expect(await erc20_1.balanceOf(sender.address)).to.equal(ethers.utils.parseUnits("85.0", 18));
  });

  it("redeem", async function () {
    //message consist of event SwapInitialized(address from, uint256 chainFrom, address to, uint256 chainTo, string tokenSymbol, uint256 amount, uint256 nonce);
    const signedDataHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "address", "uint256", "string", "uint256", "uint256"],
      [sender.address, chainId1, receiver.address, chainId2, symbol, amount, nonce]
    );
    // At this step we are making ethers to treat data as bytes array,
    // not string
    const bytesArray = ethers.utils.arrayify(signedDataHash);
    const flatSignature = await backendService.signMessage(bytesArray);

    // We signed everything, but before knocking contract, we have to
    // split signature into 3 different components - v, r, s.
    signature = ethers.utils.splitSignature(flatSignature);

    // here are v, r and s - components of single EC digital signature
    //console.log(signature.v, signature.r, signature.s);

    expect(await erc20_2.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("0.0", 18));

    //function redeem(address from, uint256 chainFrom, address to, uint256 chainTo, string memory tokenSymbol, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s )
    await bridge_2.connect(receiver).redeem(sender.address, chainId1, receiver.address, chainId2, symbol, amount, nonce, signature.v, signature.r, signature.s);

    expect(await erc20_2.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("15.0", 18));
  });

  it("swap unknown token", async function () {
    await expect(bridge_1.connect(sender).swap("SHIB", receiver.address, chainId2, amount))
      .to.be.revertedWith("Unknown tokenSymbol");
  });

  it("redeem wrong chain", async function () {
    //function redeem(address from, uint256 chainFrom, address to, uint256 chainTo, string memory tokenSymbol, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s )
    await expect(bridge_2.connect(receiver).redeem(sender.address, chainId1, receiver.address, 333, symbol, amount, nonce, signature.v, signature.r, signature.s))
      .to.be.revertedWith("Wrong chainTo");
  });

  it("redeem unknown token", async function () {
    await expect(bridge_2.connect(receiver).redeem(sender.address, chainId1, receiver.address, chainId2, "SHIB", amount, nonce, signature.v, signature.r, signature.s))
      .to.be.revertedWith("Unknown tokenSymbol");
  });

  it("redeem twice", async function () {
    await expect(bridge_2.connect(receiver).redeem(sender.address, chainId1, receiver.address, chainId2, symbol, amount, nonce, signature.v, signature.r, signature.s))
      .to.be.revertedWith("Replay attack prevented");
  });

  it("redeem wrong amount", async function () {
    await expect(bridge_2.connect(receiver).redeem(sender.address, chainId1, receiver.address, chainId2, symbol, ethers.utils.parseUnits("33.0", 18), nonce, signature.v, signature.r, signature.s))
      .to.be.revertedWith("<censored>: invalid sig");
  });

  it("add token with the same symbol", async function () {
    await expect(bridge_1.addToken(erc20_2.address))
      .to.be.revertedWith("Token symbol already exist");
  });

  it("remove non existent token", async function () {
    await expect(bridge_1.removeToken(shib.address))
      .to.be.revertedWith("The token does not exist.");
  });

  it("removeToken", async function () {
    await bridge_1.removeToken(erc20_1.address);
    await bridge_2.removeSigner(backendService.address);
  });

});
