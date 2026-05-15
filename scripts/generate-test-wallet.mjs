/**
 * Gera uma carteira EVM nova (apenas para testnet / deploy local).
 *
 * Correr na TUA máquina: npm run wallet:generate
 *
 * Nunca commits o .env nem partilhes a PRIVATE_KEY.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"

const privateKey = generatePrivateKey()
const account = privateKeyToAccount(privateKey)

console.log("")
console.log("=== Nova carteira (Arc / EVM testnet) — MANTÉM EM SEGREDO ===")
console.log("")
console.log("Endereço (para pedir faucet na Arc Testnet):")
console.log(account.address)
console.log("")
console.log("Cola ISTO no ficheiro .env na raiz do projeto (o .env já está no .gitignore):")
console.log(`PRIVATE_KEY=${privateKey}`)
console.log("")
console.log("Seguinte: 1) pedir USDC de teste para esse endereço  2) npm run deploy:arc")
console.log("")
