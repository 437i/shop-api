/**
 * Проверка готовности локального Compose-стенда для живого e2e-прогона.
 *
 * Модуль разделён на две части:
 * - `classifyReadiness` — чистая функция классификации собранных результатов
 *   (тестируется без Docker и сети, поэтому `npm run test` остаётся герметичным);
 * - функции сбора — обращаются к Docker и HTTP и вызываются только из CLI-обёртки
 *   и `globalSetup` живого Playwright-конфига.
 */

/** Сервисы, которые должны быть запущены в локальном Compose-проекте. */
export const EXPECTED_SERVICES = ["api", "auth", "postgres", "auth-postgres"] as const

/** Контейнеры, имена которых однозначно указывают на локальный стенд. */
export const EXPECTED_CONTAINERS = ["be3-postgres", "be3-auth-postgres"] as const

/** Адрес Go API по умолчанию — как в healthcheck сервиса `api` в Compose. */
export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8080"

/** Префикс, по которому ищутся записи прошлых прогонов. */
export const LEFTOVER_PREFIX = "e2e-live-"

/** Hostname, которые считаются локальными. */
export const LOOPBACK_HOSTNAMES = ["127.0.0.1", "localhost", "::1"] as const

export type ComposeEntry = {
  Name?: string
  Service?: string
  State?: string
  Health?: string
  Project?: string
  Publishers?: { PublishedPort?: number; TargetPort?: number }[]
}

export type ProbeResult = {
  status: number | null
  error?: string
}

/** Результат проверки адреса Go API: локальный ли он и совпадает ли порт. */
export type ApiAddressValidation =
  | { ok: true; port: number }
  | { ok: false; reason: string }

export type ReadinessInput = {
  compose: { entries: ComposeEntry[]; error?: string }
  apiAddress: { ok: boolean; port?: number; reason?: string }
  api: ProbeResult | null
  auth: ProbeResult | null
  leftovers: string[]
}

export type ReadinessCheck = {
  id: string
  ok: boolean
  message: string
  skipped?: boolean
}

export type ReadinessStatus =
  | "ready"
  | "api-address-invalid"
  | "not-local-stack"
  | "api-unavailable"
  | "auth-unavailable"

export type ReadinessReport = {
  status: ReadinessStatus
  ready: boolean
  checks: ReadinessCheck[]
  leftovers: string[]
  hints: string[]
}

export type StackCheckOptions = {
  apiBaseUrl?: string
  cwd?: string
  prefix?: string
}

function describeProbe(probe: ProbeResult): string {
  if (probe.status !== null) return `HTTP ${probe.status}`
  return probe.error ? `нет ответа (${probe.error})` : "нет ответа"
}

/** Локальный ли hostname: `127.0.0.1`, `localhost` или `::1`. */
export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
  return (LOOPBACK_HOSTNAMES as readonly string[]).includes(normalized)
}

/**
 * Проверяет адрес Go API до любых обращений к нему: hostname должен быть
 * локальным, а порт — совпадать с опубликованным портом локального сервиса `api`.
 */
export function validateApiAddress(
  apiBaseUrl: string,
  publishedPort: number | null,
): ApiAddressValidation {
  let url: URL
  try {
    url = new URL(apiBaseUrl)
  } catch {
    return {
      ok: false,
      reason: `адрес "${apiBaseUrl}" не является корректным URL`,
    }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      reason: `протокол "${url.protocol}" не поддерживается, ожидается http или https`,
    }
  }

  if (!isLoopbackHostname(url.hostname)) {
    return {
      ok: false,
      reason: `hostname "${url.hostname}" не локальный, ожидается 127.0.0.1, localhost или ::1`,
    }
  }

  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 80

  if (publishedPort !== null && port !== publishedPort) {
    return {
      ok: false,
      reason: `порт ${port} не совпадает с опубликованным портом локального сервиса api (${publishedPort})`,
    }
  }

  return { ok: true, port }
}

/** Опубликованный порт локального Compose-сервиса `api`. */
export function publishedApiPort(entries: ComposeEntry[]): number | null {
  const api = entries.find((entry) => entry.Service === "api")
  if (!api) return null
  for (const publisher of api.Publishers ?? []) {
    if (typeof publisher.PublishedPort === "number") {
      return publisher.PublishedPort
    }
  }
  return null
}

/**
 * Классифицирует собранные результаты проверки стенда.
 * Чистая функция: не обращается к Docker, HTTP и файловой системе.
 */
export function classifyReadiness(input: ReadinessInput): ReadinessReport {
  const checks: ReadinessCheck[] = []
  const hints: string[] = []

  const addressOk = input.apiAddress.ok
  checks.push({
    id: "api-address",
    ok: addressOk,
    message: addressOk
      ? `адрес Go API локальный (порт ${input.apiAddress.port})`
      : `адрес Go API отклонён: ${input.apiAddress.reason}`,
  })

  const running = new Set(
    input.compose.entries
      .filter((entry) => (entry.State ?? "").toLowerCase() === "running")
      .map((entry) => entry.Service ?? ""),
  )
  const containerNames = new Set(
    input.compose.entries.map((entry) => entry.Name ?? ""),
  )
  const missingServices = EXPECTED_SERVICES.filter(
    (service) => !running.has(service),
  )
  const missingContainers = EXPECTED_CONTAINERS.filter(
    (container) => !containerNames.has(container),
  )
  const composeOk =
    missingServices.length === 0 && missingContainers.length === 0

  checks.push({
    id: "compose",
    ok: composeOk,
    message: composeOk
      ? "ожидаемый локальный Compose-стенд запущен"
      : `ожидаются сервисы [${EXPECTED_SERVICES.join(", ")}] и контейнеры [${EXPECTED_CONTAINERS.join(", ")}]; не запущены [${missingServices.join(", ")}], отсутствуют [${missingContainers.join(", ")}]`,
  })

  const apiOk = input.api !== null && input.api.status === 200
  checks.push({
    id: "api",
    ok: apiOk,
    skipped: input.api === null,
    message:
      input.api === null
        ? "не выполнялось: адрес Go API отклонён до обращения к нему"
        : apiOk
          ? "Go API отвечает"
          : `Go API недоступен (${describeProbe(input.api)})`,
  })

  const authOk = input.auth !== null && input.auth.status === 401
  checks.push({
    id: "auth",
    ok: authOk,
    skipped: input.auth === null,
    message:
      input.auth === null
        ? "не выполнялось: адрес Go API отклонён до обращения к нему"
        : authOk
          ? "цепочка Go API → gRPC → Java auth жива"
          : `auth-сервис недоступен: без токена ожидался 401, получено ${describeProbe(input.auth)}`,
  })

  let status: ReadinessStatus = "ready"
  if (!addressOk) status = "api-address-invalid"
  else if (!composeOk) status = "not-local-stack"
  else if (!apiOk) status = "api-unavailable"
  else if (!authOk) status = "auth-unavailable"

  if (input.compose.error) {
    hints.push(`не удалось получить состояние Compose: ${input.compose.error}`)
  }
  if (input.leftovers.length > 0) {
    hints.push(
      `в локальной auth-postgres остались записи прошлых прогонов: ${input.leftovers.join(", ")}`,
    )
  }

  return { status, ready: status === "ready", checks, leftovers: input.leftovers, hints }
}

/** Разбирает вывод `docker compose ps --format json` (запись JSON на строку или массив). */
export function parseComposeEntries(output: string): ComposeEntry[] {
  const trimmed = output.trim()
  if (!trimmed) return []

  const entries: ComposeEntry[] = []
  for (const line of trimmed.split("\n")) {
    const candidate = line.trim()
    if (!candidate.startsWith("{")) continue
    try {
      entries.push(JSON.parse(candidate) as ComposeEntry)
    } catch {
      // строка не разобралась — пропускаем её
    }
  }
  if (entries.length > 0) return entries

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed as ComposeEntry[]
  } catch {
    // вывод не является JSON-массивом
  }
  return []
}

/** Состояние локального Compose-проекта. */
export function collectComposeState(cwd: string): {
  entries: ComposeEntry[]
  error?: string
} {
  try {
    const output = runCommand("docker", ["compose", "ps", "--format", "json"], cwd)
    return { entries: parseComposeEntries(output) }
  } catch (error) {
    return { entries: [], error: error instanceof Error ? error.message : String(error) }
  }
}

/** Доступность Go API: та же проверка, что в healthcheck сервиса `api`. */
export async function probeApi(apiBaseUrl: string): Promise<ProbeResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/swagger/index.html`, {
      redirect: "follow",
    })
    return { status: response.status }
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Живая цепочка авторизации: запрос без токена обязан вернуть 401 — это возможно
 * только когда Go API жив и gRPC до Java auth работает.
 */
export async function probeAuthChain(apiBaseUrl: string): Promise<ProbeResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/products`, {
      redirect: "follow",
    })
    return { status: response.status }
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Запрос к локальной auth-postgres: email-ы записей с префиксом прогона. */
export function buildLeftoverUsersQuery(prefix: string): string {
  return `SELECT email FROM users WHERE email ILIKE '${escapeSqlLiteral(prefix)}%' ORDER BY email;`
}

/** Записи прошлых прогонов, оставшиеся в локальной auth-postgres. */
export function collectLeftoverUsers(cwd: string, prefix: string): string[] {
  try {
    const output = runCommand(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "auth-postgres",
        "sh",
        "-c",
        psqlShellCommand(buildLeftoverUsersQuery(prefix)),
      ],
      cwd,
    )
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  } catch {
    return []
  }
}

/** Полная проверка готовности стенда. */
export async function checkLiveStack(
  options: StackCheckOptions = {},
): Promise<ReadinessReport> {
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const cwd = options.cwd ?? nodeProcess().cwd()
  const prefix = options.prefix ?? LEFTOVER_PREFIX

  const compose = collectComposeState(cwd)

  // адрес проверяется до обращений к нему: при нелокальном адресе или чужом
  // порте запросы не отправляются и данные не создаются
  const address = validateApiAddress(
    apiBaseUrl,
    publishedApiPort(compose.entries),
  )
  if ("reason" in address) {
    return classifyReadiness({
      compose,
      apiAddress: { ok: false, reason: address.reason },
      api: null,
      auth: null,
      leftovers: [],
    })
  }

  const api = await probeApi(apiBaseUrl)
  const auth = await probeAuthChain(apiBaseUrl)
  const leftovers = collectLeftoverUsers(cwd, prefix)

  return classifyReadiness({
    compose,
    apiAddress: { ok: true, port: address.port },
    api,
    auth,
    leftovers,
  })
}

/** Форматирует отчёт о готовности для вывода в консоль. */
export function formatReadinessReport(report: ReadinessReport): string {
  const lines: string[] = []
  lines.push(
    report.ready
      ? "стенд готов к живому прогону"
      : `стенд не готов: ${report.status}`,
  )
  for (const check of report.checks) {
    const mark = check.skipped ? "skip" : check.ok ? "ok" : "fail"
    lines.push(`  [${mark}] ${check.id}: ${check.message}`)
  }
  for (const hint of report.hints) {
    lines.push(`  [hint] ${hint}`)
  }
  return lines.join("\n")
}

/** Команда `psql` внутри контейнера: учётные данные берутся из окружения контейнера. */
export function psqlShellCommand(query: string): string {
  return `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "${query.replace(/"/g, '\\"')}"`
}

/** Экранирует одинарную кавычку для SQL-литерала. */
export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
}

type NodeProcess = {
  cwd: () => string
  getBuiltinModule: (id: string) => unknown
}

type ChildProcessModule = {
  execFileSync: (
    file: string,
    args: string[],
    options: {
      cwd: string
      encoding: "utf8"
      stdio: ["ignore", "pipe", "pipe"]
    },
  ) => string
}

/**
 * Доступ к Node-встроенным модулям без статического импорта: app-проект
 * (`tsconfig.app.json`) не подключает типы Node, а менять конфигурацию запрещено.
 */
function nodeProcess(): NodeProcess {
  return (globalThis as unknown as { process: NodeProcess }).process
}

function execFileSync(
  file: string,
  args: string[],
  options: {
    cwd: string
    encoding: "utf8"
    stdio: ["ignore", "pipe", "pipe"]
  },
): string {
  const childProcess = nodeProcess().getBuiltinModule(
    "child_process",
  ) as ChildProcessModule
  return childProcess.execFileSync(file, args, options)
}
