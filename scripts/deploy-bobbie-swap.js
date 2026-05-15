/**
 * Deploy MockArcToken + BobbieArcSwap on Arc Testnet.
 * Requires PRIVATE_KEY and (optionally) ARC_TESTNET_RPC_URL in .env
 *
 * After deploy, set in Vercel / .env.local:
 *   NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS=0x...
 *   NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS=0x...   (same as MockArcToken)
 *   NEXT_PUBLIC_ARC_ERC20_DECIMALS=18
 */
const USDC_ARC_TESTNET = "0x3600000000000000000000000000000000000000"

async function main() {
  const hre = require("hardhat")
  const pk = process.env.PRIVATE_KEY?.trim()
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    console.error("[ARC//_ENV_MISSING] Set PRIVATE_KEY in .env (see .env.example).")
    process.exit(1)
  }

  const [deployer] = await hre.ethers.getSigners()
  console.log("[ARC//_DEPLOYER]", deployer.address)

  const MockArcToken = await hre.ethers.getContractFactory("MockArcToken")
  const token = await MockArcToken.deploy()
  await token.waitForDeployment()
  const tokenAddr = await token.getAddress()
  console.log("[ARC//_TOKEN]", tokenAddr)

  const rateNum = 684n
  const rateDen = 1000n

  const BobbieArcSwap = await hre.ethers.getContractFactory("BobbieArcSwap")
  const swap = await BobbieArcSwap.deploy(USDC_ARC_TESTNET, tokenAddr, rateNum, rateDen)
  await swap.waitForDeployment()
  const swapAddr = await swap.getAddress()
  console.log("[ARC//_SWAP]", swapAddr)

  const tx = await token.setSwap(swapAddr)
  await tx.wait()
  console.log("[ARC//_LINKED] MockArcToken.swap = BobbieArcSwap")

  const fs = require("fs")
  const path = require("path")
  const constantsDir = path.join(__dirname, "..", "src", "constants")
  fs.writeFileSync(
    path.join(constantsDir, "bobbieSwapAddress.generated.ts"),
    `// AUTO-GENERATED — scripts/deploy-bobbie-swap.js\nexport const bobbieSwapAddress = "${swapAddr}" as \\`0x\\${string}\\`;\n`,
    "utf8",
  )
  fs.writeFileSync(
    path.join(constantsDir, "bobbieArcTokenAddress.generated.ts"),
    `// AUTO-GENERATED — scripts/deploy-bobbie-swap.js\nexport const bobbieArcTokenAddress = "${tokenAddr}" as \\`0x\\${string}\\`;\n`,
    "utf8",
  )
  console.log("[ARC//_CODEGEN] src/constants/bobbieSwapAddress.generated.ts + bobbieArcTokenAddress.generated.ts")

  console.log("\n--- Optional: override in .env / Vercel ---")
  console.log(`NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS=${swapAddr}`)
  console.log(`NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS=${tokenAddr}`)
  console.log("NEXT_PUBLIC_ARC_ERC20_DECIMALS=18")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
