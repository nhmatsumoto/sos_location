# Checklist de Testes de Segurança

## Referenciais

- OWASP Top 10 / ASVS
- NIST CSF
- ISO/IEC 27001/27002
- LGPD/APPI/GDPR (quando aplicável)

## Testes técnicos

- [ ] Verificar validação de payloads (tipos e obrigatoriedade).
- [ ] Testar limites/rate-limit para endpoints sensíveis.
- [ ] Validar ausência de segredos em código/versionamento.
- [ ] Revisar tratamento de erros para não vazar dados internos.
- [ ] Checar políticas de CORS e headers de segurança (CSP, HSTS, X-Frame-Options, nosniff).
- [ ] Verificar sanitização de entradas textuais.
- [ ] Verificar proteção CSRF para rotas aplicáveis.
- [ ] Verificar políticas TLS e redirecionamento HTTPS em produção.
- [ ] Executar varredura SAST/DAST no pipeline.
