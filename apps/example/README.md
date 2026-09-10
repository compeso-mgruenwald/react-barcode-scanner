# Example

Vite+ app for trying `@thewirv/react-barcode-scanner` in a browser. It is a workspace package; install once from the repo root.

```bash
pnpm install
pnpm dev
```

The demo stops after a successful scan or a camera error. Use **Scan again** or **Retry** to set `doScan` back to `true`.

`pnpm check` from the repo root also builds this app. App-specific Vite settings are in `apps/example/vite.config.ts`. Shared fmt and lint live in the root `vite.config.ts`.
