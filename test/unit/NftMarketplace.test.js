const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const chai = require("chai");
const eventemitter2 = require("chai-eventemitter2");

chai.use(eventemitter2());

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft Marketplace Unit Tests", function () {
      let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract;
      const PRICE = ethers.parseEther("0.1");
      const TOKEN_ID = 0;

      beforeEach(async () => {
        accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture(["all"]);
        nftMarketplaceContract = await ethers.getContract("NftMarketplace");
        nftMarketplace = nftMarketplaceContract.connect(deployer);
        basicNftContract = await ethers.getContract("BasicNft");
        basicNft = basicNftContract.connect(deployer);
        await basicNft.mintNft();
        await basicNft.approve(nftMarketplaceContract.target, TOKEN_ID);
      });

      describe("listItem", function () {
        it("emits an event after listing an item", async function () {
          expect(
            await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
          ).to.emit(nftMarketplace, "ItemListed");
        });
        it("exclusively items that haven't been listed", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          const error = `AlreadyListed("${basicNft.target}", ${TOKEN_ID})`;

          let hasThrown = false;
          try {
            await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              error,
              `The error message should be "${error}"`
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected listItem to throw an AlreadyListed error"
          );
        });

        it("exclusively allows owners to list", async function () {
          nftMarketplace = nftMarketplaceContract.connect(user);
          await basicNft.approve(user.address, TOKEN_ID);

          let hasThrown = false;
          try {
            await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NotOwner",
              "Expected error message to contain 'NotOwner'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected listItem to throw a NotOwner error"
          );
        });

        it("needs approvals to list item", async function () {
          await basicNft.approve(
            "0x0000000000000000000000000000000000000000",
            TOKEN_ID
          );

          let hasThrown = false;
          try {
            await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NotApprovedForMarketplace",
              "Expected error message to contain 'NotApprovedForMarketplace'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected listItem to throw a NotApprovedForMarketplace error"
          );
        });

        it("Updates listing with seller and price", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          const listing = await nftMarketplace.getListing(
            basicNft.target,
            TOKEN_ID
          );
          assert(listing.price.toString() == PRICE.toString());
          assert(listing.seller.toString() == deployer.address);
        });
        it("reverts if the price is 0", async () => {
          const ZERO_PRICE = ethers.parseEther("0");
          let hasThrown = false;

          try {
            await nftMarketplace.listItem(
              basicNft.target,
              TOKEN_ID,
              ZERO_PRICE
            );
          } catch (err) {
            hasThrown = true;
            // Check for the custom error in the error message
            assert.include(
              err.message,
              "PriceMustBeAboveZero",
              "Expected error message to contain 'PriceMustBeAboveZero'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected listItem to throw a NftMarketplace__PriceMustBeAboveZero error"
          );
        });
      });
      describe("cancelListing", function () {
        it("reverts if there is no listing", async function () {
          const error = `NotListed("${basicNft.target}", ${TOKEN_ID})`;
          let hasThrown = false;

          try {
            await nftMarketplace.cancelListing(basicNft.target, TOKEN_ID);
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              error,
              `Expected error message to contain '${error}'`
            );
          }

          assert.isTrue(
            hasThrown,
            `Expected cancelListing to throw a ${error} error`
          );
        });

        it("reverts if anyone but the owner tries to call", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);
          await basicNft.approve(user.address, TOKEN_ID);

          let hasThrown = false;
          try {
            await nftMarketplace.cancelListing(basicNft.target, TOKEN_ID);
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NotOwner",
              "Expected error message to contain 'NotOwner'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected cancelListing to throw a NotOwner error"
          );
        });

        it("emits event and removes listing", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          expect(
            await nftMarketplace.cancelListing(basicNft.target, TOKEN_ID)
          ).to.emit("ItemCanceled");
          const listing = await nftMarketplace.getListing(
            basicNft.target,
            TOKEN_ID
          );
          assert(listing.price.toString() == "0");
        });
      });
      describe("buyItem", function () {
        it("reverts if the item isn't listed", async function () {
          let hasThrown = false;
          try {
            await nftMarketplace.buyItem(basicNft.target, TOKEN_ID);
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NotListed",
              "Expected error message to contain 'NotListed'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected buyItem to throw a NotListed error"
          );
        });

        it("reverts if the price isn't met", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);

          let hasThrown = false;
          try {
            await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
              value: ethers.parseEther("0"),
            }); // Assuming the price is higher than 0
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "PriceNotMet",
              "Expected error message to contain 'PriceNotMet'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected buyItem to throw a PriceNotMet error"
          );
        });

        it("transfers the nft to the buyer and updates internal proceeds record", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);
          expect(
            await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
              value: PRICE,
            })
          ).to.emit("ItemBought");
          const newOwner = await basicNft.ownerOf(TOKEN_ID);
          const deployerProceeds = await nftMarketplace.getProceeds(
            deployer.address
          );
          assert(newOwner.toString() == user.address);
          assert(deployerProceeds.toString() == PRICE.toString());
        });
      });
      describe("updateListing", function () {
        it("must be owner and listed", async function () {
          // Test for NotListed error
          let hasThrown = false;
          try {
            await nftMarketplace.updateListing(
              basicNft.target,
              TOKEN_ID,
              PRICE
            );
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NotListed",
              "Expected error message to contain 'NotListed'"
            );
          }
          assert.isTrue(
            hasThrown,
            "Expected updateListing to throw a NotListed error"
          );

          // Setup for next test
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);

          // Test for NotOwner error
          hasThrown = false;
          try {
            await nftMarketplace.updateListing(
              basicNft.target,
              TOKEN_ID,
              PRICE
            );
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NotOwner",
              "Expected error message to contain 'NotOwner'"
            );
          }
          assert.isTrue(
            hasThrown,
            "Expected updateListing to throw a NotOwner error"
          );
        });

        it("reverts if new price is 0", async function () {
          const updatedPrice = ethers.parseEther("0");
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);

          let hasThrown = false;
          try {
            await nftMarketplace.updateListing(
              basicNft.target,
              TOKEN_ID,
              updatedPrice
            );
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "PriceMustBeAboveZero",
              "Expected error message to contain 'PriceMustBeAboveZero'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected updateListing to throw a PriceMustBeAboveZero error"
          );
        });

        it("updates the price of the item", async function () {
          const updatedPrice = ethers.parseEther("0.2");
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          expect(
            await nftMarketplace.updateListing(
              basicNft.target,
              TOKEN_ID,
              updatedPrice
            )
          ).to.emit("ItemListed");
          const listing = await nftMarketplace.getListing(
            basicNft.target,
            TOKEN_ID
          );
          assert(listing.price.toString() == updatedPrice.toString());
        });
      });
      describe("withdrawProceeds", function () {
        it("doesn't allow 0 proceed withdrawals", async function () {
          let hasThrown = false;
          try {
            await nftMarketplace.withdrawProceeds();
          } catch (err) {
            hasThrown = true;
            assert.include(
              err.message,
              "NoProceeds",
              "Expected error message to contain 'NoProceeds'"
            );
          }

          assert.isTrue(
            hasThrown,
            "Expected withdrawProceeds to throw a NoProceeds error"
          );
        });

        it("withdraws proceeds", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);
          await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
            value: PRICE,
          });
          nftMarketplace = nftMarketplaceContract.connect(deployer);

          const deployerProceedsBefore = await nftMarketplace.getProceeds(
            deployer.address
          );
          const deployerBalanceBefore = await ethers.provider.getBalance(
            deployer.address
          );
          const txResponse = await nftMarketplace.withdrawProceeds();
          const transactionReceipt = await txResponse.wait(1);
          const { gasUsed, gasPrice } = transactionReceipt;
          const gasCost = gasUsed * BigInt(gasPrice);
          const deployerBalanceAfter = await ethers.provider.getBalance(
            deployer.address
          );

          assert(
            (deployerBalanceAfter + gasCost).toString() ==
              (deployerProceedsBefore + deployerBalanceBefore).toString()
          );
        });
      });
    });
