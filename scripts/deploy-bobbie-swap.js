/**
 * Deploy MockSwapToken (ARC, ETH, WBTC) + BobbieMultiSwap on Arc Testnet.
 * Requires PRIVATE_KEY and (optionally) ARC_TESTNET_RPC_URL in .env
 *
 * Fund the swap contract with USDC/EURC for reverse paths (burn demo token → receive stablecoin).
 *
 * Optional overrides in .env / Vercel:
 *   NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS=0x...
 *   NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS=0x...
 *   NEXT_PUBLIC_BOBBIE_ETH_TOKEN_ADDRESS=0x...
 *   NEXT_PUBLIC_BOBBIE_WBTC_TOKEN_ADDRESS=0x...
 */
const USDC_ARC_TESTNET = "0x3600000000000000000000000000000000000000"
const EURC_ARC_TESTNET = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"

async function main() {
  const hre = require("hardhat")
  const pk = process.env.PRIVATE_KEY?.trim()
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    console.error("[ARC//_ENV_MISSING] Set PRIVATE_KEY in .env (see .env.example).")
    process.exit(1)
  }

  const [deployer] = await hre.ethers.getSigners()
  console.log("[ARC//_DEPLOYER]", deployer.address)

  const MockSwapToken = await hre.ethers.getContractFactory("MockSwapToken")
  const arc = await MockSwapToken.deploy("ARC Demo", "ARC", 18)
  await arc.waitForDeployment()
  const arcAddr = await arc.getAddress()
  console.log("[ARC//_TOKEN_ARC]", arcAddr)

  const eth = await MockSwapToken.deploy("ETH Demo", "ETH", 18)
  await eth.waitForDeployment()
  const ethAddr = await eth.getAddress()
  console.log("[ARC//_TOKEN_ETH]", ethAddr)

  const wbtc = await MockSwapToken.deploy("WBTC Demo", "WBTC", 8)
  await wbtc.waitForDeployment()
  const wbtcAddr = await wbtc.getAddress()
  console.log("[ARC//_TOKEN_WBTC]", wbtcAddr)

  const BobbieMultiSwap = await hre.ethers.getContractFactory("BobbieMultiSwap")
  const swap = await BobbieMultiSwap.deploy(USDC_ARC_TESTNET, EURC_ARC_TESTNET, arcAddr, ethAddr, wbtcAddr)
  await swap.waitForDeployment()
  const swapAddr = await swap.getAddress()
  console.log("[ARC//_SWAP]", swapAddr)

  for (const [label, token] of [
    ["ARC", arc],
    ["ETH", eth],
    ["WBTC", wbtc],
  ]) {
    const tx = await token.setSwap(swapAddr)
    await tx.wait()
    console.log(`[ARC//_LINKED] ${label}.swap = BobbieMultiSwap`)
  }

  const fs = require("fs")
  const path = require("path")
  const constantsDir = path.join(__dirname, "..", "src", "constants")
  const tsAddrType = "`0x${string}`"
  const write = (file, varName, addr) => {
    fs.writeFileSync(
      path.join(constantsDir, file),
      `// AUTO-GENERATED — scripts/deploy-bobbie-swap.js\n` +
        `export const ${varName} = "${addr}" as ${tsAddrType};\n`,
      "utf8",
    )
  }
  write("bobbieSwapAddress.generated.ts", "bobbieSwapAddress", swapAddr)
  write("bobbieArcTokenAddress.generated.ts", "bobbieArcTokenAddress", arcAddr)
  write("bobbieEthTokenAddress.generated.ts", "bobbieEthTokenAddress", ethAddr)
  write("bobbieWbtcTokenAddress.generated.ts", "bobbieWbtcTokenAddress", wbtcAddr)
  console.log("[ARC//_CODEGEN] src/constants/*.generated.ts")

  console.log("\n--- Optional: override in .env / Vercel ---")
  console.log(`NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS=${swapAddr}`)
  console.log(`NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS=${arcAddr}`)
  console.log(`NEXT_PUBLIC_BOBBIE_ETH_TOKEN_ADDRESS=${ethAddr}`)
  console.log(`NEXT_PUBLIC_BOBBIE_WBTC_TOKEN_ADDRESS=${wbtcAddr}`)
  console.log("NEXT_PUBLIC_ARC_ERC20_DECIMALS=18")
  console.log("\nFund BobbieMultiSwap with USDC and EURC for reverse swaps (ARC/ETH/WBTC → stablecoin).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
