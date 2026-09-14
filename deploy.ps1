# Deploy Cloudflare Pages (substitui o deploy Vercel)
# Requisitos: wrangler autenticado (npx wrangler login) e secrets configurados
# Secrets: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, WRITE_SECRET

npm run build; if ($?) {
  # --branch main = deploy em PRODUÇÃO (sem isso cai em Preview)
  npx wrangler pages deploy dist --project-name unidos-fc --branch main --commit-dirty=true 2>&1 | Tee-Object -Variable output
  $deployUrl = ($output | Select-String -Pattern 'https://[\w-]+\.unidos-fc\.pages\.dev' | Select-Object -First 1).Matches.Value
  if ($deployUrl) {
    Write-Host "`nApp: $deployUrl"
    Write-Host "Producao: https://unidossuzano.com.br"
  }
}

# Configurar secrets (rodar apenas uma vez)
# "valor" | npx wrangler pages secret put PGHOST --project-name unidos-fc
# "valor" | npx wrangler pages secret put PGPORT --project-name unidos-fc
# "valor" | npx wrangler pages secret put PGDATABASE --project-name unidos-fc
# "valor" | npx wrangler pages secret put PGUSER --project-name unidos-fc
# "valor" | npx wrangler pages secret put PGPASSWORD --project-name unidos-fc
# "valor" | npx wrangler pages secret put WRITE_SECRET --project-name unidos-fc