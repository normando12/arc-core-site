const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ArcGovernance", function () {
  async function deploy() {
    const Gov = await hre.ethers.getContractFactory("ArcGovernance");
    const gov = await Gov.deploy();
    await gov.waitForDeployment();
    return gov;
  }

  it("deploys with two chambers", async function () {
    const gov = await deploy();
    expect(await gov.chamberCount()).to.equal(2n);
    const c1 = await gov.getChamber(1);
    expect(c1.title).to.include("Institutional");
  });

  it("emitGmBurst grants PRESENCE_PER_BURST once per wave", async function () {
    const [alice] = await hre.ethers.getSigners();
    const gov = await deploy();
    expect(await gov.presenceScore(alice.address)).to.equal(0n);
    await gov.connect(alice).emitGmBurst();
    expect(await gov.presenceScore(alice.address)).to.equal(10n);
    await gov.connect(alice).emitGmBurst();
    expect(await gov.presenceScore(alice.address)).to.equal(20n);
  });

  it("vote adds PRESENCE_PER_VOTE and applies voteWeight to tallies", async function () {
    const [alice] = await hre.ethers.getSigners();
    const gov = await deploy();
    await gov.connect(alice).emitGmBurst();
    expect(await gov.voteWeight(alice.address)).to.equal(100n);

    const tx = await gov.connect(alice).vote(1, true);
    await tx.wait();

    expect(await gov.presenceScore(alice.address)).to.equal(10n + 20n);
    const c1 = await gov.getChamber(1);
    expect(c1.forVotes).to.equal(100n);
    expect(c1.againstVotes).to.equal(0n);
  });

  it("reverts double vote in same chamber", async function () {
    const [alice] = await hre.ethers.getSigners();
    const gov = await deploy();
    await gov.connect(alice).vote(1, true);
    await expect(gov.connect(alice).vote(1, false)).to.be.revertedWith("ARC//_DOUBLE_VOTE_BLOCKED");
  });

  it("allows vote in a second chamber", async function () {
    const [alice] = await hre.ethers.getSigners();
    const gov = await deploy();
    await gov.connect(alice).vote(1, true);
    await gov.connect(alice).vote(2, false);
    expect(await gov.presenceScore(alice.address)).to.equal(40n);
  });

  it("caps GM bursts per UTC day then resets after 1 day", async function () {
    const [alice] = await hre.ethers.getSigners();
    const gov = await deploy();
    for (let i = 0; i < 10; i++) {
      await gov.connect(alice).emitGmBurst();
    }
    expect(await gov.gmBurstsToday(alice.address)).to.equal(10n);
    await expect(gov.connect(alice).emitGmBurst()).to.be.revertedWith("ARC//_DAILY_GM_CAP");

    await time.increase(86400);
    await gov.connect(alice).emitGmBurst();
    expect(await gov.gmBurstsToday(alice.address)).to.equal(1n);
  });

  it("VoteCast includes newPresenceScore", async function () {
    const [alice] = await hre.ethers.getSigners();
    const gov = await deploy();
    await expect(gov.connect(alice).vote(1, true))
      .to.emit(gov, "VoteCast")
      .withArgs(alice.address, 1n, true, 100n, 100n, 0n, 20n);
  });
});
