const fs = require("fs");
const path = require("path");

function writeGeneratedConstants(artifact, contractAddress) {
  const outDir = path.join(__dirname, "..", "src", "constants");
  fs.mkdirSync(outDir, { recursive: true });

  const abiPath = path.join(outDir, "arcGovernanceAbi.generated.ts");
  const abiBody = `// AUTO-GENERATED — scripts/deploy.js
export const arcGovernanceAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;
  fs.writeFileSync(abiPath, abiBody, "utf8");

  const addrPath = path.join(outDir, "arcGovernanceAddress.generated.ts");
  const addrBody = `// AUTO-GENERATED — scripts/deploy.js
export const arcGovernanceAddress = "${contractAddress}" as \`0x\${string}\`;
`;
  fs.writeFileSync(addrPath, addrBody, "utf8");

  const indexPath = path.join(outDir, "index.ts");
  const indexBody = `// Re-exports generated governance bindings
export { arcGovernanceAbi } from "./arcGovernanceAbi.generated";
export { arcGovernanceAddress } from "./arcGovernanceAddress.generated";
`;
  fs.writeFileSync(indexPath, indexBody, "utf8");
}

async function main() {
  const hre = require("hardhat");
  const log = (code, msg) => console.log(`[${code}] ${msg}`);

  log("ARC//_COMPILE", "artifact pipeline engaged");
  const ArcGovernance = await hre.ethers.getContractFactory("ArcGovernance");
  log("ARC//_DEPLOY", "broadcasting ArcGovernance…");
  const gov = await ArcGovernance.deploy();
  await gov.waitForDeployment();
  const address = await gov.getAddress();

  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ArcGovernance.sol",
    "ArcGovernance.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error("ARC//_ARTIFACT_MISSING — run `npx hardhat compile`");
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  writeGeneratedConstants(artifact, address);

  log("ARC//_DEPLOY", `contract surface live @ ${address}`);
  log("ARC//_EXPORT", "ABI + address synced → src/constants/");
}

main().catch((e) => {
  console.error("[ARC//_DEPLOY_FAIL]", e.message || e);
  process.exit(1);
});
