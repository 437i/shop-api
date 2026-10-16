import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import {
  AUTH_TOKEN_STORAGE_KEY,
  ApiError,
  NetworkError,
  apiClient,
  setUnauthorizedHandler,
} from "@/shared/api/client"

const TOKEN = "test-token"

let fetchMock: Mock<typeof fetch>

function stubJsonResponse(status: number, body: unknown): void {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    vi.unstubAllGlobals()
  })

  describe("request headers", () => {
    it("sends a JSON POST with the Bearer token stored in localStorage", async () => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
      stubJsonResponse(200, { token: "jwt" })

      const response = await apiClient.post<
        { email: string; password: string },
        { token: string }
      >("/auth", { email: "user@example.com", password: "secret" })

      expect(response).toEqual({ token: "jwt" })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe("/api/v1/auth")
      expect(init).toMatchObject({ method: "POST" })
      expect(init?.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      })
      expect(init?.body).toBe(
        JSON.stringify({ email: "user@example.com", password: "secret" }),
      )
    })

    it("adds the Bearer token to GET requests", async () => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
      stubJsonResponse(200, [])

      await apiClient.get("/clients")

      const [, init] = fetchMock.mock.calls[0]!
      expect(init?.headers).toMatchObject({
        Authorization: `Bearer ${TOKEN}`,
      })
    })

    it("omits the Authorization header when no token is stored", async () => {
      stubJsonResponse(200, [])

      await apiClient.get("/clients")

      const [, init] = fetchMock.mock.calls[0]!
      expect(init?.headers).not.toHaveProperty("Authorization")
    })
  })

  describe("request building", () => {
    it("appends defined query parameters to the request URL", async () => {
      stubJsonResponse(200, [])

      await apiClient.get("/clients", {
        limit: 10,
        offset: 0,
        name: undefined,
        surname: null,
      })

      expect(fetchMock.mock.calls[0]![0]).toBe(
        "/api/v1/clients?limit=10&offset=0",
      )
    })

    it("returns undefined for 204 responses", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await expect(apiClient.get("/clients/1")).resolves.toBeUndefined()
    })
  })

  describe("401 handling", () => {
    it("resets the session for a protected endpoint and throws ApiError", async () => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
      const onUnauthorized = vi.fn()
      setUnauthorizedHandler(onUnauthorized)
      stubJsonResponse(401, { error: "invalid or expired token" })

      await expect(apiClient.get("/clients")).rejects.toMatchObject({
        status: 401,
      })

      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
      expect(onUnauthorized).toHaveBeenCalledTimes(1)
    })

    it("keeps the session for a 401 from the auth endpoint", async () => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
      const onUnauthorized = vi.fn()
      setUnauthorizedHandler(onUnauthorized)
      stubJsonResponse(401, { error: "invalid or expired token" })

      await expect(
        apiClient.post("/auth", {
          email: "user@example.com",
          password: "secret",
        }),
      ).rejects.toBeInstanceOf(ApiError)

      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(TOKEN)
      expect(onUnauthorized).not.toHaveBeenCalled()
    })
  })

  describe("error responses", () => {
    it("throws an ApiError with the ErrorResponse message", async () => {
      stubJsonResponse(400, { message: "invalid credentials" })

      await expect(
        apiClient.post("/auth", {
          email: "user@example.com",
          password: "wrong",
        }),
      ).rejects.toMatchObject({
        status: 400,
        responseMessage: "invalid credentials",
        message: "invalid credentials",
      })
    })

    it.each([400, 500, 502, 503])(
      "throws an ApiError with the HTTP status %i",
      async (status) => {
        stubJsonResponse(status, { message: `error ${status}` })

        await expect(apiClient.get("/clients")).rejects.toMatchObject({
          status,
          responseMessage: `error ${status}`,
        })
      },
    )

    it("falls back to a generic message when the response has no message", async () => {
      stubJsonResponse(503, { error: "auth service unavailable" })

      await expect(apiClient.get("/clients")).rejects.toMatchObject({
        status: 503,
        message: "Request failed with status 503",
      })
    })
  })

  describe("network failures", () => {
    it("throws a NetworkError when fetch rejects", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

      await expect(apiClient.get("/clients")).rejects.toBeInstanceOf(
        NetworkError,
      )
    })
  })
})
