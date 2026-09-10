# Example

Vite+ app for trying `@thewirv/react-barcode-scanner` in a browser. It is a workspace package. Install once from the repo root.

```bash
pnpm install
pnpm dev
```

The demo sets `doScan` false after a hit or error, then true again to retry.

`pnpm check` from the repo root also builds this app. App-specific Vite settings are in `apps/example/vite.config.ts`. Shared fmt and lint live in the root `vite.config.ts`.
