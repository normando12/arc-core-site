export type WalletCommandKind = "most_used_token" | "gas_fees" | "total_balance"

export type ParsedWalletCommand = {
  kind: WalletCommandKind
  /** When true, analytics should filter to the current calendar day (UTC). */
  todayOnly: boolean
}

function normalizeInput(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

/**
 * Detects natural-language wallet analytics intents in Portuguese or English.
 * Examples: "qual token mais usei hoje?", "quanto paguei em taxas?", "meu saldo total".
 */
export function parseWalletCommand(raw: string): ParsedWalletCommand | null {
  const t = normalizeInput(raw)
  if (!t) return null

  const todayOnly = /\b(hoje|today|agora|now)\b/.test(t)

  const mostUsedTokenPatterns = [
    /\bqual\s+(?:token|moeda|moedas|ativo|ativos|cripto)\b.*\b(?:mais|principal)\b.*\b(?:usei|usou|use|used|moviment|interag|transacion)\b/,
    /\b(?:token|moeda|moedas)\s+(?:que\s+)?(?:mais|principal)\b.*\b(?:usei|usou|use|used|moviment|interag)\b/,
    /\b(?:most|mais)\s+(?:used|usado|usada|utilizado|utilizada)\s+(?:token|moeda|coin)\b/,
    /\bwhich\s+(?:token|coin|asset)\b.*\b(?:most|frequently)\b/,
    /\bmost\s+(?:used|active)\s+(?:token|coin|asset)\b/,
  ]

  const gasFeePatterns = [
    /\b(?:quanto|quanta)\b.*\b(?:gastei|paguei|pago|gasto|gastou|spend|spent|paid|pay)\b.*\b(?:taxa|taxas|gas|fee|fees|tarifa)\b/,
    /\b(?:taxa|taxas|gas|fee|fees|tarifa)\b.*\b(?:gastei|paguei|gasto|spend|spent|paid|total|hoje|today)\b/,
    /\b(?:quanto|how\s+much)\b.*\b(?:gastei|paguei|gasto|spend|spent|paid)\b.*\b(?:em|in|on)\b.*\b(?:taxa|taxas|gas|fee|fees)\b/,
    /\bgas\s+(?:fee|fees|spent|cost|tracker|gasto)\b/,
    /\bfees?\s+(?:today|hoje|spent|paid|total)\b/,
  ]

  const balancePatterns = [
    /\b(?:meu|minha|my)\s+(?:saldo|balance:?\s*saldo|balance|portfolio|carteira|wallet)\b/,
    /\b(?:saldo|balance)\s+(?:total|geral|atual|da\s+wallet|da\s+carteira|completo)\b/,
    /\b(?:mostrar|mostre|show|ver|veja|qual)\s+(?:meu|minha|my)?\s*(?:saldo|balance|portfolio|carteira)\b/,
    /\btotal\s+(?:balance|saldo|da\s+carteira|da\s+wallet)\b/,
    /\bwallet\s+balance\b/,
  ]

  if (includesAny(t, mostUsedTokenPatterns)) {
    return { kind: "most_used_token", todayOnly: todayOnly || /\bhoje\b/.test(t) }
  }

  if (includesAny(t, gasFeePatterns)) {
    return { kind: "gas_fees", todayOnly: todayOnly || /\bhoje\b/.test(t) }
  }

  if (includesAny(t, balancePatterns)) {
    return { kind: "total_balance", todayOnly: false }
  }

  return null
}

export function walletCommandLoadingLabel(kind: WalletCommandKind): string {
  switch (kind) {
    case "most_used_token":
      return "Analisando transações na ARC Network…"
    case "gas_fees":
      return "Calculando taxas de gas em USDC…"
    case "total_balance":
      return "Consultando saldos on-chain…"
  }
}

export function walletCommandIconKind(kind: WalletCommandKind): "analytics" | "gas" | "wallet" {
  switch (kind) {
    case "most_used_token":
      return "analytics"
    case "gas_fees":
      return "gas"
    case "total_balance":
      return "wallet"
  }
}
