npm run build; if ($?) {
  npx vercel --prod --scope bpdantas33s-projects 2>&1 | Tee-Object -Variable output
  $deployUrl = ($output | Select-String -Pattern 'https://[\w-]+\.vercel\.app' | Select-Object -First 1).Matches.Value
  if ($deployUrl) {
    # Mantém ambos os aliases (não remove o antigo unidos-gestao-esportiva)
    npx vercel alias set $deployUrl unidos-fc.vercel.app
    Write-Host "Deploy concluído em https://unidos-fc.vercel.app"
  }
}
