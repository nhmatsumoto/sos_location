---
name: plateau-source-indexing
description: Use this skill when implementing or updating crawling/indexing of PLATEAU and geospatial portals, including source metadata registry and evidence artifacts.
---

# PLATEAU Source Indexing

## When to use
- Requests requiring official-source traceability for PLATEAU, INDE, GeoSampa, DataGeo, Earthdata, OpenTopography, or Atlas.

## Workflow
1. Maintain canonical seed URLs in `scripts/source_seed_urls.txt`.
2. Run `scripts/build_source_index.py` to generate `artifacts/source-index/sources.json`.
3. Record failures as `http_error` or `error` without inventing content.
4. Keep references synchronized in delivery docs.

## Validation
1. `sources.json` must include `url, fetch_status, title, last_modified, content_hash`.
2. Index generation must be deterministic for unchanged content.
