# Codex as Host Platform

> Use this with `cowork-as-host-platform.md` and `feishu-miaoda-as-host-platform.md`.
> It defines DevFlow behavior when the active host is Codex.

## What Codex Provides

Codex is an AI coding host with:

- repo-aware file reading and editing
- shell execution under sandbox and approval rules
- MCP tools, apps, plugins, browser automation, and automations when available
- installed skills under `${CODEX_HOME:-$HOME/.codex}/skills`
- explicit sub-agent tooling in Codex conversations when DevFlow is invoked

Do not rebuild these host capabilities inside project code unless the task itself requires a durable runtime feature.

## DevFlow Invocation Boundary

`@dev-orchestrator` in Codex means the user is explicitly asking DevFlow to run a multi-agent workflow. For that DevFlow task only, the orchestrator may use Codex sub-agents to preserve DevFlow's independent specialist and reviewer boundaries.

Normal Codex coding requests outside `@dev-orchestrator` remain normal single-agent Codex work and must not be forced through DevFlow.

## Dispatch Runtime Mapping

When DevFlow dispatches a specialist in Codex, record runtime provenance in the handoff packet, permit, and dispatch event where possible:

```yaml
host_platform: codex
dispatch_backend: codex_multi_agent
dispatch_mode: true_subagent
degraded_independence: false
```

Allowed values:

- `host_platform`: `cowork` or `codex`
- `dispatch_backend`: `cowork_skill`, `codex_multi_agent`, or `manual`
- `dispatch_mode`: `true_subagent`, `role_emulation`, or `user_explicit_skill_invocation`
- `degraded_independence`: boolean

`role_emulation` is a degraded fallback. Gate 3 must surface it, because DevFlow's review independence guarantee is weaker when one agent performs multiple specialist roles.

## Codex-Specific Constraints

- Shell commands may need approval for network, destructive actions, or writes outside writable roots.
- Browser and MCP availability is session-dependent. Treat platform capability discovery as dynamic.
- Installed skill metadata uses `name` and `description`; extra frontmatter such as `triggers` is documentation only.
- Codex skill sync must not overwrite unrelated user skills.
- `devflow-self-improve` is not Codex-ready in the MVP because its collection scripts read Cowork session JSONL paths.

## Practical Default

For Codex MVP tasks:

1. Keep state store and gate scripts unchanged.
2. Use Codex sub-agents for specialist/reviewer dispatch when `@dev-orchestrator` is explicitly invoked.
3. Record runtime provenance on each dispatch.
4. If a true Codex sub-agent is unavailable, use `dispatch_mode: role_emulation` and mark `degraded_independence: true`.
