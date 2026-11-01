# FSSO Stack agent constraints

This file records the frontend and repository constraints that later changes must keep. FSSO means F# + Svelte + SQLite + OpenAPI for this template. It is a general starter, not a product for a particular industry.

## Frontend

The user-facing app is SvelteKit with `@sveltejs/adapter-node`. Do not replace it with a Svelte + Vite single-page app, and do not describe the production deployment as one .NET process.

- SvelteKit root is `web/`. Dependencies and the lockfile stay in the repository root. Do not add `pnpm-workspace.yaml`, `apps/`, Turborepo, or a persistent `web/package.json`.
- `scripts/shadcn-add.mjs` and `scripts/build.mjs` may create a temporary `web/package.json` for the official CLI or adapter-node and must delete it before they exit. New visual controls come from that CLI. Do not hand-write replacement buttons, inputs, dialogs, tables, or form primitives.
- Demo create uses `sveltekit-superforms` and the official `Form.Field`, `Form.Control`, `Form.Label`, and `Form.FieldErrors` components. Tailwind is for layout. Semantic HTML is allowed where no installed component exists.
- Browser calls use the generated OpenAPI SDK. TanStack Query wraps those calls. The server hook proxies `/api` and `/openapi` to `FSSO_API_ORIGIN`. Node does not open SQLite and does not authenticate against the database.

## Processes

Development runs `dotnet` for the API and `vite dev` in `web/` for SvelteKit. Production runs `dotnet artifacts/publish/Fsso.Host.dll` for the API and `node web/build/index.js` for the page. The browser uses the SvelteKit origin; that process proxies API calls. The Host does not serve the page.

## Backend that must stay

Do not remove or relocate the F# backend: ASP.NET Core Minimal APIs, MediatR, SqlHydra, SQLite, OpenAPI generation, the generated TypeScript SDK, and the Demo and Notes modules. Do not move business rules from F# into Node. Do not regenerate the SDK unless the OpenAPI contract itself changes, and then update the contract hashes in the same change.

## Documentation

`README.md`, `README_zh.md`, and `docs/architecture-guide.zh.md` must describe the commands, ports, and environment variables that the scripts actually use. Historical review notes and baseline evidence files stay as records of the commits they describe.
