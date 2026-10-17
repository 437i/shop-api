const API_BASE_URL = "/api/v1"

const AUTH_PATH = "/auth"

export const AUTH_TOKEN_STORAGE_KEY = "auth_token"

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  readonly status: number
  readonly responseMessage?: string

  constructor(status: number, responseMessage?: string) {
    super(responseMessage ?? `Request failed with status ${status}`)
    this.name = "ApiError"
    this.status = status
    this.responseMessage = responseMessage
  }
}

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Network request failed", { cause })
    this.name = "NetworkError"
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

interface ErrorResponse {
  message?: string
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${API_BASE_URL}${path}`

  if (!params) {
    return url
  }

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  }

  const query = searchParams.toString()

  return query ? `${url}?${query}` : url
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const token = getAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === "object" && value !== null
}

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json()

    if (!isErrorResponse(body)) {
      return undefined
    }

    return typeof body.message === "string" ? body.message : undefined
  } catch {
    return undefined
  }
}

function handleUnauthorized(path: string): void {
  if (path === AUTH_PATH) {
    return
  }

  clearAuthToken()
  unauthorizedHandler?.()
}

async function request<TResponse>(
  path: string,
  params: QueryParams | undefined,
  init: RequestInit,
): Promise<TResponse> {
  let response: Response

  try {
    response = await fetch(buildUrl(path, params), init)
  } catch (cause) {
    throw new NetworkError(cause)
  }

  if (response.status === 401) {
    handleUnauthorized(path)
  }

  if (!response.ok) {
    const responseMessage = await readErrorMessage(response)

    throw new ApiError(response.status, responseMessage)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

export const apiClient = {
  post<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
    return request<TResponse>(path, undefined, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })
  },

  get<TResponse>(path: string, params?: QueryParams): Promise<TResponse> {
    return request<TResponse>(path, params, {
      method: "GET",
      headers: buildHeaders(),
    })
  },

  patch<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
    return request<TResponse>(path, undefined, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })
  },

  delete<TResponse>(path: string): Promise<TResponse> {
    return request<TResponse>(path, undefined, {
      method: "DELETE",
      headers: buildHeaders(),
    })
  },
}
