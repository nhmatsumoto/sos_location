# Diagramas (texto)

## Visão de alto nível

```text
[Frontend Mapa]
   |  /api/*
   v
[Backend Django]
   |-- apps/api/views.py (cadastros operacionais)
   |-- apps/api/views_integrations.py (data hub)
   |-- apps/api/integrations/* (adapters + normalização + cache)
   v
[DB SQLite/PostgreSQL]
   |-- MissingPerson / AttentionAlert / CollapseReport

[Provedores Externos]
   |-- Open-Meteo
   |-- INMET CAP/WIS2(RSS/Atom)
   |-- Portal da Transparência (CGU)
   |-- NASA GIBS / Planetary STAC / NOAA GOES
```
