/**
 * Writes ABI + placeholder (or env) address after `npx hardhat compile`.
 * Full deploy overwrites via scripts/deploy.js
 */
const fs = require("fs");
const path = require("path");

const ZERO = "0x0000000000000000000000000000000000000000";

function main() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ArcGovernance.sol",
    "ArcGovernance.json"
  );
  if (!fs.existsSync(artifactPath)) {
    console.error("[ARC//_CODEGEN_FAIL] artifact missing — run `npx hardhat compile`");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const outDir = path.join(__dirname, "..", "src", "constants");
  fs.mkdirSync(outDir, { recursive: true });

  const abiPath = path.join(outDir, "arcGovernanceAbi.generated.ts");
  fs.writeFileSync(
    abiPath,
    `// AUTO-GENERATED — scripts/sync-constants-abi.js
export const arcGovernanceAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;
`,
    "utf8"
  );

  const addr =
    process.env.NEXT_PUBLIC_ARC_GOVERNANCE_ADDRESS ||
    process.env.ARC_GOVERNANCE_ADDRESS ||
    ZERO;
  const addrPath = path.join(outDir, "arcGovernanceAddress.generated.ts");
  fs.writeFileSync(
    addrPath,
    `// AUTO-GENERATED — scripts/sync-constants-abi.js (placeholder until deploy)
export const arcGovernanceAddress = "${addr}" as \`0x\${string}\`;
`,
    "utf8"
  );

  const indexPath = path.join(outDir, "index.ts");
  fs.writeFileSync(
    indexPath,
    `export { arcGovernanceAbi } from "./arcGovernanceAbi.generated";
export { arcGovernanceAddress } from "./arcGovernanceAddress.generated";
`,
    "utf8"
  );

  console.log("[ARC//_CODEGEN] ABI + address stub → src/constants/");
}

main();
