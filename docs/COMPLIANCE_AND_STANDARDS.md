# Normas, Padrões e Compliance (Baseline)

Este documento mapeia referências de segurança/privacidade para o MG Location.

## Referências internacionais adotadas

- **ISO/IEC 27001, 27002, 27017, 27018, 27701**
  - Roadmap de SGSI/PIMS, controles técnicos e organizacionais.
- **OWASP Top 10, ASVS, SAMM**
  - Referência para desenvolvimento seguro e maturidade de segurança.
- **NIST CSF / NIST SP 800-53 / NIST SP 800-63**
  - Governança de controles e identidade digital.
- **IETF RFCs (TLS 1.2/1.3, OAuth2, OIDC, headers HTTP)**
  - Base técnica de protocolos web e transporte seguro.
- **PCI DSS (quando aplicável)**
  - Somente para cenários com processamento de cartão.
- **CSA CCM / STAR**
  - Referência para postura cloud.
- **GDPR**
  - Princípios de consentimento, minimização e direitos do titular.

## Brasil

- **LGPD (Lei 13.709/2018)**
  - Base legal, minimização de dados, gestão de incidentes e governança.
- Diretrizes setoriais (BACEN/TCU) conforme aplicabilidade contratual/regulatória.

## Japão

- **APPI** (Personal Information Protection Commission)
- Diretrizes IPA/METI para desenvolvimento seguro e gestão de cibersegurança.

## Controles técnicos mínimos (baseline atual)

- HTTPS obrigatório em produção (TLS 1.2+; recomendado TLS 1.3)
- HSTS (configurável por ambiente)
- CSP (Content Security Policy) com possibilidade de override por env
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restritiva
- Validação server-side em endpoints
- Proteções CSRF (Django)

## Gaps e próximos passos

- Rate limiting centralizado por IP/rota
- SAST/DAST no pipeline CI
- Gestão formal de identidade (MFA/OIDC) para áreas administrativas
- Integração com SIEM e trilha de auditoria expandida
- Plano de retenção/eliminação de dados por tipo de registro
