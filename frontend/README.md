# React + TypeScript + Vite

## Testing

### Unit tests (Vitest)

```sh
npm run test
```

### End-to-end tests (Playwright)

Install the browsers required by Playwright once per machine:

```sh
npx playwright install
```

Run the e2e suite (Playwright starts the Vite dev server automatically at http://127.0.0.1:5173):

```sh
npm run test:e2e
```

E2E specs live in `e2e/` and intercept the API with `page.route()`; they do not require the Go API or any other backend to run. Vitest only collects specs from `src/` (see `vite.config.ts`), so Playwright specs are not picked up by `npm run test`.

## Local authentication

The default local stack uses the real Java authentication service. `docker-compose` starts `auth` (Java, gRPC on the internal port `50051`, reached by the Go API through `AUTH_GRPC_HOST` and `AUTH_GRPC_PORT`) and `auth-postgres`; `api/cmd/api` runs `app.Module`, so `POST /api/v1/register` and `POST /api/v1/auth` perform a real registration and login. The browser still talks only to the Go HTTP API and never to the Java service or its database.

### Development mock (opt-in)

`app.MockModule` is kept as an explicit alternative for local development without the Java service: `POST /api/v1/auth` accepts any well-formed credentials and returns a fixed mock token, and the auth middleware accepts that same token for protected endpoints. Signing in this way verifies the frontend integration flow, not real authentication, so the mock must never be used as a substitute for verifying the real authentication flow.

The stack does not enable the mock. To work without the Java service, switch the composition in `api/cmd/api` to `app.MockModule` locally — an explicit local option, not a change of the default composition, which stays `app.Module`. The mock module serves every auth endpoint, including `POST /api/v1/change`; the `502 "Authentication service unavailable"` response belongs to the real auth service path and cannot be triggered by the mock module.

### Access model of the local stack

The local stack authenticates users for real, but it does not separate access: every account that registers through `POST /api/v1/register` receives a token that grants the same administrative operations over clients, products, suppliers and images, because the Go API and the Java authentication service define no user access levels and no authorization checks. The stack is a local development environment and must not be deployed publicly. Before any public deployment the access model has to be changed in a separate change: authorization checks belong on the backend, and restricting registration alone would not create an access model.

## Live e2e run against the local stack (opt-in)

The regular e2e suite mocks the API. The live run exercises the real path — browser → Go API → Java auth → databases — and is therefore **not** part of `npm run test`, `npm run test:e2e`, `npm run check` or the common CI run: it needs the local Compose stack and it writes test data into the local databases.

```sh
npm run test:e2e:live
```

Prerequisite: the local stack must be running (`docker compose up -d` in the repository root). The run starts with a readiness check — the expected local Compose project, the Go API, and the Go API → gRPC → Java auth chain — and stops before creating any test data if the stack is not ready. The Go API address must be local (a loopback host) and its port must match the published port of the local `api` service: a foreign hostname, a foreign IP or another port is rejected before a single request is sent. The same check is available on its own:

```sh
npm run live:preflight
```

Each run gets its own identifier, for example `e2e-live-20261022T134643Z-bve2p6`. It is passed to the specs through the `E2E_LIVE_RUNID` environment variable and is used as the prefix of every test entity, so leftovers of an interrupted run are easy to find and to remove by hand.

Test data created by a run: a test user per scenario (plus one registered through the UI form), a supplier, a product and a client, all named with the run prefix. The cleanup is registered in the Playwright teardown and therefore runs even when a scenario fails: the entities are deleted through the Go API in the order product → client → supplier, and the test users are deleted from the local `auth-postgres` by the run prefix. Nothing outside the current run is touched.

The live run never manages the stack lifecycle and never deletes permanent data: `docker compose down -v`, `docker volume rm`, `docker compose down` and `prune` are forbidden, and the persistent volumes `postgres_data`, `pgadmin_data` and `auth_postgres_data` are out of scope for the run.

## Template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
