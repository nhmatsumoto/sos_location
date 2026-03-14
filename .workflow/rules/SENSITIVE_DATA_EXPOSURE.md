# Rule: NEVER_EXPOSE_SENSITIVE_DATA

mode: mandatory
priority: critical

## Descrição
Nenhuma chave de API, segredo, senha, certificado ou arquivo de configuração local deve ser adicionado ao controle de versão (Git).

## Restrições de Entrada (Checklist de Commit)
1. **Arquivos `.env`**: NUNCA commitar arquivos `.env` ou `.env.local`. Apenas `.env.example` é permitido.
2. **Chaves e Certificados**: Arquivos `.pem`, `.key`, `.pfx`, `.crt` são terminantemente proibidos no repositório.
3. **Senhas em Código**: Hardcoding de senhas em arquivos `.cs`, `.tsx` ou `.py` deve ser detectado e removido. Use variáveis de ambiente.
4. **Appsettings**: `appsettings.Local.json` e `appsettings.Development.json` (quando contiver segredos) devem estar no `.gitignore`.

## Ação do Agente
- Se um agente detectar que uma chave de API está sendo escrita diretamente no código ou subida para o git, ele deve INTERROMPER a tarefa e exigir o uso de segredos (`Environment Variables` ou `Docker Secrets`).
- O `TestAgent` deve realizar um grep por padrões de alta entropia ou palavras-chave (key, password, secret) em novas alterações antes do commit.
