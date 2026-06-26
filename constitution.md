# Proreus AI Constitution & Spec-Driven Guidelines

## 1. Core Philosophy

Proreus is a hyper-lightweight, zero-config mobile control deck for server infrastructure. The project should favor extreme performance, minimal footprint, and zero-friction deployment in every architectural and implementation decision.

Core principles:
- Keep the mobile application responsive and resource-efficient.
- Keep the server agent lean, predictable, and easy to deploy.
- Prefer simple, durable solutions over heavy abstractions.
- Optimize for open-source maintainability, contributor clarity, and long-term reliability.

## 2. Tech Stack Mandates

### Frontend (`app/`)

- **Core:** React Native + Expo (Hermes engine)
- **Routing:** Expo Router
- **Styling:** NativeWind
- **State management:** Zustand for local UI state, TanStack Query for server state
- **Charts:** React Native Skia or Victory Native XL
- **Security:** `expo-secure-store`

Mandatory rule:
- **AsyncStorage must never be used for SSH keys, API tokens, or any other sensitive credentials.**

### Backend (`agent/`)

- **Core:** Go (Golang)
- **Framework:** Echo, with WebSocket support enabled where required
- **System libraries:** `shirou/gopsutil` for hardware and OS metrics, the official Docker Go SDK for container management, and `golang.org/x/crypto/ssh` for macro and command execution
- **Deployment:** Docker multi-stage build targeting a distroless or scratch-style final image whenever practical

## 3. Design System

Proreus uses a layered translucency design system optimized for dark, high-contrast server dashboards.

### Core visual tokens

- **Background:** `#09090B` (`zinc-950`)
- **Card surfaces:** translucent white overlays such as `bg-white/4`, paired with `border-white/10` and dark shadows
- **Semantic accents:**
  - Teal: `#2DD4BF`
  - Green: `#4ADE80`
  - Amber: `#FBBF24`
  - Rose: `#FB7185`

### Platform rule

`<BlurView>` must not be applied to every card or surface. On Android, blur fallbacks do not reliably match the intended design quality. Blur should be reserved for the following UI layers only:
- Top navigation bars
- Bottom tab bars
- Modal overlays

Primary content cards should rely on translucency, borders, spacing, and semantic color rather than blur-heavy rendering.

## 4. API-First Workflow

The absolute single source of truth for HTTP contracts is:

- `api/openapi.yaml`

Mandatory rules:
- Do not manually write raw `fetch` or Axios calls in the React Native application for standard API access.
- Generate API clients using `@hey-api/openapi-ts`.
- Define all HTTP contracts in `api/openapi.yaml`.
- Generate models, interfaces, and routing scaffolding with `oapi-codegen`.
- Implement business logic in handwritten Go packages outside generated code.

## 5. Generated Code Policy

Generated code is an output artifact, not a manual editing surface.

Rules:
- Files in `app/src/generated/` must not be edited by hand.
- Go code generated from OpenAPI definitions must not be edited by hand.
- All API changes must begin in `api/openapi.yaml`.
- After changing the spec, regenerate clients and server scaffolding before implementation is considered complete.
- Handwritten wrappers, adapters, and feature-specific logic must live outside generated folders.

## 6. Security Rules

Security is a core product requirement.

Mandatory rules:
- Never store secrets in AsyncStorage, logs, screenshots, or any unsecured client-side location.
- Destructive actions must require biometric re-authentication or an explicit confirmation flow.
- Docker socket access must be minimized and treated as privileged.
- SSH macros must be allowlisted or validated server-side before execution.
- Sensitive credentials must be protected in transit and at rest using the approved platform mechanisms.

## 7. Performance Rules

Performance is a non-negotiable product characteristic.

Mandatory rules:
- Avoid unnecessary re-renders in live dashboards and high-frequency update screens.
- Use Skia-based chart rendering for realtime analytics where appropriate.
- Minimize background polling; prefer WebSockets for live metrics, logs, and events.
- Preserve a low memory footprint on both the mobile client and the server agent.
- Do not introduce large dependencies unless they provide clear, measurable value.

## 8. Repository Workflow

Repository changes must preserve spec integrity and documentation quality.

Rules:
- Feature branches must update the OpenAPI spec whenever API behavior changes.
- Pull requests that change the API surface must include regenerated code and example payloads when applicable.
- README content, setup instructions, and documentation must remain aligned with shipped behavior.
- Changes that affect deployment or installation must update the relevant documentation in the same pull request.

## 9. Testing Rules

Critical system behavior must be validated continuously.

Rules:
- All critical agent handlers require unit and/or integration test coverage.
- API contract validation must run in CI.
- Generated client code must build successfully before merge.
- Realtime and command-execution paths should be tested where practical, especially for security-sensitive functionality.

## 10. AI and Contributor Constraints

All contributors, including AI-assisted workflows, must follow these constraints:

- Do not introduce new frameworks without clear technical justification.
- Do not replace mandated libraries casually or based on preference alone.
- Do not add heavy dependencies for trivial features.
- Prefer the smallest viable abstraction that preserves clarity and maintainability.
- Respect the spec-driven workflow, generated code boundaries, and security rules at all times.

## 11. Enforcement

This document acts as the architectural and contributor rulebook for Proreus. Any pull request, proposal, generated output, or AI-assisted change that violates these guidelines should be revised before merge.