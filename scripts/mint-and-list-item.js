const { ethers, network } = require("hardhat");
const { moveBlocks, sleep } = require("../utils/move-blocks");

const PRICE = ethers.parseEther("0.1");

async function mintAndList() {
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const basicNft = await ethers.getContract("BasicNft");
  console.log("Minting NFT...");
  const mintTx = await basicNft.mintNft();
  const mintTxReceipt = await mintTx.wait(1);
  const tokenId = mintTxReceipt.logs[0].args.tokenId;
  console.log("Approving NFT...");
  const approvalTx = await basicNft.approve(nftMarketplace.target, tokenId);
  await approvalTx.wait(1);
  console.log("Listing NFT...");
  const tx = await nftMarketplace.listItem(basicNft.target, tokenId, PRICE);
  await tx.wait(1);
  console.log("NFT Listed!");

  if (network.config.chainId === 31337) {
    console.log("Moving blocks...");
    await moveBlocks(1, (sleepAmount = 1000));
  }
}

mintAndList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
