import { describe, expect, it } from "vitest"

import {
  EXPECTED_CONTAINERS,
  EXPECTED_SERVICES,
  buildLeftoverUsersQuery,
  classifyReadiness,
  formatReadinessReport,
  isLoopbackHostname,
  parseComposeEntries,
  psqlShellCommand,
  publishedApiPort,
  validateApiAddress,
  type ApiAddressValidation,
  type ComposeEntry,
  type ReadinessInput,
} from "./stack-readiness"

function rejectionReason(result: ApiAddressValidation): string {
  return "reason" in result ? result.reason : ""
}

function composeEntry(service: string, name: string, state = "running"): ComposeEntry {
  return { Name: name, Service: service, State: state }
}

function readyInput(): ReadinessInput {
  return {
    compose: {
      entries: [
        composeEntry("api", "be3-api"),
        composeEntry("auth", "be3-auth"),
        composeEntry("postgres", "be3-postgres"),
        composeEntry("auth-postgres", "be3-auth-postgres"),
      ],
    },
    apiAddress: { ok: true, port: 8080 },
    api: { status: 200 },
    auth: { status: 401 },
    leftovers: [],
  }
}

describe("classifyReadiness", () => {
  it("готовит стенд, когда сервисы запущены, API отвечает и цепочка авторизации жива", () => {
    const report = classifyReadiness(readyInput())

    expect(report.status).toBe("ready")
    expect(report.ready).toBe(true)
    expect(report.checks.map((check) => check.ok)).toEqual([true, true, true, true])
    expect(report.hints).toEqual([])
  })

  it("отказывает, если запущен не ожидаемый локальный стенд", () => {
    const input = readyInput()
    input.compose.entries = [
      composeEntry("api", "prod-api"),
      composeEntry("auth", "prod-auth"),
    ]

    const report = classifyReadiness(input)

    expect(report.status).toBe("not-local-stack")
    expect(report.ready).toBe(false)
    expect(report.checks[1]?.ok).toBe(false)
    expect(report.checks[1]?.message).toContain("postgres")
    expect(report.checks[1]?.message).toContain("be3-postgres")
  })

  it("отказывает, если сервис Compose не запущен", () => {
    const input = readyInput()
    input.compose.entries = input.compose.entries.filter(
      (entry) => entry.Service !== "auth",
    )

    const report = classifyReadiness(input)

    expect(report.status).toBe("not-local-stack")
    expect(report.checks[1]?.message).toContain("auth")
  })

  it("отказывает, если Go API недоступен", () => {
    const input = readyInput()
    input.api = { status: null, error: "connection refused" }

    const report = classifyReadiness(input)

    expect(report.status).toBe("api-unavailable")
    expect(report.ready).toBe(false)
    expect(report.checks[2]?.ok).toBe(false)
    expect(report.checks[2]?.message).toContain("connection refused")
  })

  it("отказывает, если auth-сервис недоступен вместо 401", () => {
    const input = readyInput()
    input.auth = { status: 503 }

    const report = classifyReadiness(input)

    expect(report.status).toBe("auth-unavailable")
    expect(report.ready).toBe(false)
    expect(report.checks[3]?.ok).toBe(false)
    expect(report.checks[3]?.message).toContain("401")
    expect(report.checks[3]?.message).toContain("503")
  })

  it("отказывает, если запрос к API не получил ответа", () => {
    const input = readyInput()
    input.auth = { status: null, error: "socket hang up" }

    expect(classifyReadiness(input).status).toBe("auth-unavailable")
  })

  it("сообщает об остатках прошлых прогонов как подсказку, а не как причину отказа", () => {
    const input = readyInput()
    input.leftovers = ["e2e-live-20261022T160000Z-a1b2c3@example.com"]

    const report = classifyReadiness(input)

    expect(report.status).toBe("ready")
    expect(report.leftovers).toEqual(input.leftovers)
    expect(report.hints.join(" ")).toContain("e2e-live-20261022T160000Z-a1b2c3@example.com")
  })

  it("перечисляет ожидаемые сервисы и контейнеры в отчёте об отказе", () => {
    const input = readyInput()
    input.compose.entries = []

    const report = classifyReadiness(input)

    for (const service of EXPECTED_SERVICES) {
      expect(report.checks[1]?.message).toContain(service)
    }
    for (const container of EXPECTED_CONTAINERS) {
      expect(report.checks[1]?.message).toContain(container)
    }
  })
})

describe("проверка адреса Go API", () => {
  it("принимает разрешённые loopback-адреса", () => {
    for (const url of [
      "http://127.0.0.1:8080",
      "http://localhost:8080",
      "http://[::1]:8080",
    ]) {
      const result = validateApiAddress(url, 8080)

      expect(result.ok).toBe(true)
      if (result.ok) expect(result.port).toBe(8080)
    }
  })

  it("отклоняет внешний hostname", () => {
    const result = validateApiAddress("https://api.example.com:8080", 8080)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(rejectionReason(result)).toContain("api.example.com")
      expect(rejectionReason(result)).toContain("не локальный")
    }
  })

  it("отклоняет внешний IP-адрес", () => {
    const result = validateApiAddress("http://93.184.216.34:8080", 8080)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(rejectionReason(result)).toContain("не локальный")
  })

  it("отклоняет порт, отличный от опубликованного", () => {
    const result = validateApiAddress("http://127.0.0.1:59999", 8080)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(rejectionReason(result)).toContain("59999")
      expect(rejectionReason(result)).toContain("8080")
    }
  })

  it("определяет loopback-hostname", () => {
    expect(isLoopbackHostname("127.0.0.1")).toBe(true)
    expect(isLoopbackHostname("localhost")).toBe(true)
    expect(isLoopbackHostname("::1")).toBe(true)
    expect(isLoopbackHostname("[::1]")).toBe(true)
    expect(isLoopbackHostname("api.example.com")).toBe(false)
    expect(isLoopbackHostname("93.184.216.34")).toBe(false)
  })

  it("читает опубликованный порт сервиса api", () => {
    const entries = [
      { Service: "auth", Publishers: [{ PublishedPort: 50051 }] },
      { Service: "api", Publishers: [{ PublishedPort: 8080 }] },
    ]

    expect(publishedApiPort(entries)).toBe(8080)
    expect(publishedApiPort([{ Service: "auth" }])).toBeNull()
  })
})

describe("отклонённый адрес прерывает проверку до запросов", () => {
  it("не выполняет пробы и не создаёт данные", () => {
    const input = readyInput()
    input.apiAddress = { ok: false, reason: "hostname не локальный" }
    input.api = null
    input.auth = null

    const report = classifyReadiness(input)

    expect(report.status).toBe("api-address-invalid")
    expect(report.ready).toBe(false)
    expect(report.checks[0]?.id).toBe("api-address")
    expect(report.checks[0]?.ok).toBe(false)
    expect(report.checks[0]?.message).toContain("не локальный")
    expect(report.checks[2]?.skipped).toBe(true)
    expect(report.checks[3]?.skipped).toBe(true)
    expect(report.leftovers).toEqual([])
  })
});

describe("parseComposeEntries", () => {
  it("разбирает вывод docker compose ps построчно", () => {
    const output = [
      JSON.stringify({ Name: "be3-api", Service: "api", State: "running" }),
      JSON.stringify({ Name: "be3-auth", Service: "auth", State: "running" }),
    ].join("\n")

    const entries = parseComposeEntries(output)

    expect(entries).toHaveLength(2)
    expect(entries[0]?.Name).toBe("be3-api")
    expect(entries[1]?.Service).toBe("auth")
  })

  it("разбирает вывод docker compose ps как JSON-массив", () => {
    const output = JSON.stringify([
      { Name: "be3-api", Service: "api", State: "running" },
    ])

    expect(parseComposeEntries(output)).toHaveLength(1)
  })

  it("возвращает пустой список для пустого или нечитаемого вывода", () => {
    expect(parseComposeEntries("")).toEqual([])
    expect(parseComposeEntries("not a json")).toEqual([])
  })
})

describe("команда psql", () => {
  it("берёт учётные данные из окружения контейнера и не содержит секретов", () => {
    const command = psqlShellCommand(buildLeftoverUsersQuery("e2e-live-"))

    expect(command).toContain('"$POSTGRES_USER"')
    expect(command).toContain('"$POSTGRES_DB"')
    expect(command).not.toMatch(/POSTGRES_PASSWORD|password/i)
    expect(command).toContain("SELECT email FROM users")
  })

  it("экранирует одинарную кавычку в префиксе", () => {
    expect(buildLeftoverUsersQuery("e2e-live-o'brien")).toContain(
      "e2e-live-o''brien",
    )
  })
})

describe("formatReadinessReport", () => {
  it("печатает вердикт и результаты проверок", () => {
    const output = formatReadinessReport(classifyReadiness(readyInput()))

    expect(output).toContain("стенд готов")
    expect(output).toContain("[ok] compose")
    expect(output).toContain("[ok] auth")
  })
})
