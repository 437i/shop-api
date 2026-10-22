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
