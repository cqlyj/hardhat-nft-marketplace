const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
  "../nextjs-nft-marketplace/src/constants/networkMapping.json";
const FRONT_END_ABI_FILE = "../nextjs-nft-marketplace/src/constants/";

module.exports = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end...");
    await updateContractAddresses();
    await updateAbi();
  }
};

async function updateAbi() {
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const abiArray = nftMarketplace.interface.fragments;
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}NftMarketplace.json`,
    JSON.stringify(abiArray)
  );

  const basicNft = await ethers.getContract("BasicNft");
  const abiArray2 = basicNft.interface.fragments;
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}BasicNft.json`,
    JSON.stringify(abiArray2)
  );

  console.log("Updating ABI in front end...");
}

async function updateContractAddresses() {
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const currentAddress = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE),
    "utf-8"
  );
  const chainId = network.config.chainId.toString();
  if (chainId in currentAddress) {
    if (!currentAddress[chainId].includes(nftMarketplace.target)) {
      currentAddress[chainId].push(nftMarketplace.target);
    }
  } else {
    currentAddress[chainId] = [nftMarketplace.target];
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddress));
  console.log("Updating contract addresses in front end...");
}

module.exports.tags = ["all", "frontend"];
