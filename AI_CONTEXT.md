# AI Development Context

## Environment
- **OS**: Windows (host), running via **WSL** (Ubuntu).
- **Node Version Management**: **nvs** (Node Version Switcher).
- **Node Version**: Use **LTS**.

## Important Commands
- All commands should be run inside WSL: `wsl <command>`.
- To use correct node version: `nvs use lts` (or ensure env is loaded).
- Build: `npm run build`
- Lint: `npm run lint`

## Notes
- Do not run `npm` or `nvs` directly from PowerShell; always wrap in `wsl`.
