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

## Local authentication (dev-mock)

Real authentication is unavailable until the Java auth service is connected. The browser talks only to the Go HTTP API, which delegates credentials to that Java service over gRPC.

In the local docker-compose stack the Go API starts with a dev-mock auth module (`api/cmd/api` → `app.MockModule`): `POST /api/v1/auth` accepts any well-formed credentials and returns a fixed mock token, and the auth middleware accepts that same token for protected endpoints. Signing in locally therefore verifies the frontend integration flow, not real authentication. The 502 "Authentication service unavailable" response belongs to the real auth service path and cannot be triggered by the mock module.

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
