const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const PRICE = ethers.parseEther("0.1");

async function mint() {
  const basicNft = await ethers.getContract("BasicNft");
  console.log("Minting NFT...");
  const mintTx = await basicNft.mintNft();
  const mintTxReceipt = await mintTx.wait(1);
  console.log(
    `Minted tokenId ${mintTxReceipt.logs[0].args.tokenId.toString()} from contract: ${
      basicNft.target
    }`
  );
  if (network.config.chainId == 31337) {
    await moveBlocks(2, (sleepAmount = 1000));
  }
}

mint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
