# Cria o repositório remoto no GitHub e faz push (precisa de `gh auth login` antes).
$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".git")) {
  Write-Error "Pasta .git não encontrada. Corre a partir da raiz do projeto (akkk)."
}
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Ainda não estás autenticado no GitHub CLI."
  Write-Host "1) Corre: gh auth login   (HTTPS + login no browser ou device)"
  Write-Host "2) Volta a correr este script."
  exit 1
}
$repo = if ($args.Count -ge 1 -and $args[0]) { $args[0] } else { "akkk" }
if (git remote get-url origin 2>$null) {
  Write-Host "Remote 'origin' já existe. A fazer push..."
  git push -u origin main
  exit $LASTEXITCODE
}
gh repo create $repo --public --source=. --remote=origin --push --description "Arc governance dapp (Next.js + Hardhat)"
exit $LASTEXITCODE
