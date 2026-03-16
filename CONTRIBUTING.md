# Contributing to SOS Location

## Project Versioning
We use [Semantic Versioning 2.0.0](https://semver.org/).
- **MAJOR**: Breaking changes or major architectural shifts (e.g., transition to v2.0.0).
- **MINOR**: New features, back-wards compatible (e.g., new GIS layers).
- **PATCH**: Bug fixes and documentation updates.

## Local Development (v2.0.0 Baseline)

### Quick Start with Docker
The fastest way to contribute is using the provided orchestration:
```bash
./dev.sh up
```

### Manual Setup (Frontend)
- **Runtime**: Bun 1.2+
- **Commands**:
  ```bash
  cd frontend-react
  bun install
  bun run dev
  ```

### Manual Setup (Backend)
- **Runtime**: .NET 10.0 SDK
- **Commands**:
  ```bash
  cd backend-dotnet
  dotnet restore
  dotnet run
  ```

## Development Workflow
1. **Branching**: Create a feature branch from `main`.
2. **Coding**: Follow Clean Architecture and DDD principles.
3. **Draft PR**: Open a Pull Request as early as possible for feedback.
4. **Validation**: Ensure `docker compose build` passes without errors.

## Code of Conduct
We adhere to the Contributor Covenant. Please be respectful and professional.

---
**SOS Location © 2026** — *Protecting the future with resilience.*
