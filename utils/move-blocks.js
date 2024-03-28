const { network } = require("hardhat");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function moveBlocks(amount, sleepAmount = 0) {
  console.log("Moving blocks...");
  for (let i = 0; i < amount; i++) {
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    if (sleepAmount) {
      console.log(`Sleeping for ${sleepAmount} ms...`);
      await sleep(sleepAmount);
    }
  }
}

module.exports = {
  moveBlocks,
  sleep,
};
