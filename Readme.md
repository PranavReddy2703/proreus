# Proreus

Proreus is an open-source, mobile-first server control platform for Wake-on-LAN, live system monitoring, Docker management, and secure remote command execution.

It pairs a React Native mobile application with a lightweight Go-based server agent to provide a fast, self-hosted control experience for homelab and server infrastructure.

## Vision

Managing headless servers from a phone is often fragmented across web wrappers, VPN setup, and heavy dashboards. Proreus addresses this by providing a native mobile interface for remotely waking, monitoring, and controlling server systems with minimal overhead.

## Key Features

- Zero-config remote access using Tailscale or Headscale
- Wake-on-LAN support for powering on offline servers
- Real-time system analytics for CPU, RAM, disk, thermals, and estimated power usage
- Docker container and Compose stack management
- SSH macro execution for predefined server tasks
- Open-source notifications via ntfy
- GPU-accelerated analytics charts for a responsive mobile experience

## Architecture

Proreus is designed as a spec-driven monorepo with a single source of truth for API contracts in `api/openapi.yaml`.

- **Mobile app:** React Native + Expo
- **Server agent:** Go
- **API generation:** OpenAPI-based client and server generation
- **Deployment:** Dockerized agent with a minimal runtime image

## Repository Structure

```txt
proreus/
├── .github/
│   └── workflows/
│       ├── app.yml
│       ├── agent.yml
│       └── release.yml
├── constitution.md
├── .agent
├── README.md
├── Makefile
├── .env.example
├── docs/
│   ├── architecture/
│   ├── screenshots/
│   ├── decisions/
│   └── setup/
├── api/
│   ├── openapi.yaml
│   ├── events/
│   └── examples/
├── deploy/
│   ├── docker/
│   ├── compose/
│   ├── systemd/
│   └── ntfy/
├── scripts/
│   ├── generate-client.sh
│   ├── dev.sh
│   └── release.sh
├── agent/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── docker/
│   │   ├── events/
│   │   ├── logs/
│   │   ├── macros/
│   │   ├── power/
│   │   ├── ssh/
│   │   └── system/
│   ├── pkg/
│   ├── test/
│   ├── go.mod
│   ├── go.sum
│   └── Dockerfile
├── app/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   ├── theme/
│   │   ├── types/
│   │   └── generated/
│   │       └── api/
│   ├── assets/
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   └── babel.config.js
└── packages/
    ├── design-tokens/
    └── config/
```

## Contributing

Contributions are welcome. Please read `constitution.md` before making changes to ensure alignment with the project’s architecture, security rules, and spec-driven workflow.

All API changes must begin in `api/openapi.yaml`.