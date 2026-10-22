import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  render,
  renderHook,
  screen,
  within,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { ProductImageDialog } from "@/features/product-images/ProductImageDialog"
import {
  productImageQueryKey,
  resolveProductImageError,
  useCurrentProductImageId,
  useDeleteProductImage,
  useProductImage,
  useReplaceProductImage,
  useUploadProductImage,
} from "@/features/product-images/useProductImage"
import { ProductsListPage } from "@/pages/products/ProductsListPage"
import {
  AUTH_TOKEN_STORAGE_KEY,
  ApiError,
  NetworkError,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const PRODUCT_ID = "1"
const IMAGE_ID = "image-1"
const IMAGE_BYTES = "image-bytes"
const PRODUCT_NAME = "Liebherr CNel 4313"

const PRODUCTS = [
  {
    id: PRODUCT_ID,
    name: "Liebherr CNel 4313",
    image_id: IMAGE_ID,
  },
]

const PRODUCTS_WITHOUT_IMAGE = [
  {
    id: PRODUCT_ID,
    name: "Liebherr CNel 4313",
  },
]

let fetchMock: Mock<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function binaryResponse(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/octet-stream" },
  })
}

function methodOf(init?: RequestInit): string {
  return init?.method ?? "GET"
}

function urlOf(input: RequestInfo | URL): string {
  return String(input)
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    )
  }
}

describe("product images feature", () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(toast, "success").mockReturnValue("ok")
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe("useProductImage", () => {
    it("does not request the image while the dialog is closed", () => {
      const queryClient = createTestQueryClient()

      renderHook(() => useProductImage(PRODUCT_ID, false), {
        wrapper: createWrapper(queryClient),
      })

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("returns the image of a 200 response", async () => {
      fetchMock.mockResolvedValue(binaryResponse(200, IMAGE_BYTES))
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useProductImage(PRODUCT_ID, true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.image).not.toBeNull())

      expect(result.current.image).toBeInstanceOf(Blob)
      expect(await result.current.image!.text()).toBe(IMAGE_BYTES)
      expect(result.current.errorMessage).toBeNull()
      expect(urlOf(fetchMock.mock.calls[0]![0])).toBe(
        "/api/v1/products/1/image",
      )
    })

    it("treats a 404 response as a missing photo without an error message", async () => {
      fetchMock.mockResolvedValue(jsonResponse(404, { message: "image not found" }))
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useProductImage(PRODUCT_ID, true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.image).toBeNull()
      expect(result.current.errorMessage).toBeNull()
    })

    it("shows the server message when the request fails", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(500, { message: "internal server error" }),
      )
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useProductImage(PRODUCT_ID, true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() =>
        expect(result.current.errorMessage).toBe("internal server error"),
      )
      expect(result.current.image).toBeNull()
    })

    it("shows no message for a 401 response and ends the session", async () => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "token")
      const onUnauthorized = vi.fn()
      setUnauthorizedHandler(onUnauthorized)
      fetchMock.mockResolvedValue(
        jsonResponse(401, { message: "invalid or expired token" }),
      )
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useProductImage(PRODUCT_ID, true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.errorMessage).toBeNull()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
      expect(onUnauthorized).toHaveBeenCalledTimes(1)
    })
  })

  describe("useCurrentProductImageId", () => {
    it("reads the actual image id from the products list", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, PRODUCTS))
      const queryClient = createTestQueryClient()

      const { result } = renderHook(
        () => useCurrentProductImageId(PRODUCT_ID),
        { wrapper: createWrapper(queryClient) },
      )

      await waitFor(() => expect(result.current).toBe(IMAGE_ID))
    })

    it("returns null when the product has no image", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, PRODUCTS_WITHOUT_IMAGE))
      const queryClient = createTestQueryClient()

      const { result } = renderHook(
        () => useCurrentProductImageId(PRODUCT_ID),
        { wrapper: createWrapper(queryClient) },
      )

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalled(),
      )
      expect(result.current).toBeNull()
    })
  })

  describe("useUploadProductImage", () => {
    it("sends the file to the product image endpoint", async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, { id: IMAGE_ID }))
      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
      const successSpy = vi.spyOn(toast, "success")
      const { result } = renderHook(() => useUploadProductImage(), {
        wrapper: createWrapper(queryClient),
      })
      const file = new Blob([IMAGE_BYTES])

      await act(async () => {
        await result.current.mutateAsync({ productId: PRODUCT_ID, file })
      })

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe("/api/v1/products/1/image")
      expect(methodOf(init)).toBe("POST")
      expect(init?.body).toBe(file)
      expect(successSpy).toHaveBeenCalledWith("Product image uploaded")
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: productImageQueryKey(PRODUCT_ID),
      })
    })
  })

  describe("useReplaceProductImage", () => {
    it("sends the file to the image endpoint of the current image", async () => {
      fetchMock.mockImplementation((_input, init) => {
        if (methodOf(init) === "GET") {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        return Promise.resolve(new Response(null, { status: 204 }))
      })
      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
      const { result } = renderHook(
        () => ({
          imageId: useCurrentProductImageId(PRODUCT_ID),
          mutation: useReplaceProductImage(PRODUCT_ID),
        }),
        { wrapper: createWrapper(queryClient) },
      )
      const file = new Blob([IMAGE_BYTES])

      await waitFor(() => expect(result.current.imageId).toBe(IMAGE_ID))

      await act(async () => {
        await result.current.mutation.mutateAsync(file)
      })

      const putCall = fetchMock.mock.calls.find(
        ([, init]) => methodOf(init) === "PUT",
      )
      expect(urlOf(putCall![0])).toBe("/api/v1/images/image-1")
      expect(putCall![1]?.body).toBe(file)
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })
    })
  })

  describe("useDeleteProductImage", () => {
    it("sends the delete request to the image endpoint of the current image", async () => {
      fetchMock.mockImplementation((_input, init) => {
        if (methodOf(init) === "GET") {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        return Promise.resolve(new Response(null, { status: 204 }))
      })
      const queryClient = createTestQueryClient()
      const successSpy = vi.spyOn(toast, "success")
      const { result } = renderHook(
        () => ({
          imageId: useCurrentProductImageId(PRODUCT_ID),
          mutation: useDeleteProductImage(PRODUCT_ID),
        }),
        { wrapper: createWrapper(queryClient) },
      )

      await waitFor(() => expect(result.current.imageId).toBe(IMAGE_ID))

      await act(async () => {
        await result.current.mutation.mutateAsync()
      })

      const deleteCall = fetchMock.mock.calls.find(
        ([, init]) => methodOf(init) === "DELETE",
      )
      expect(urlOf(deleteCall![0])).toBe("/api/v1/images/image-1")
      expect(successSpy).toHaveBeenCalledWith("Product image deleted")
    })
  })

  describe("ProductImageDialog", () => {
    function renderDialog(
      productId: string | null = PRODUCT_ID,
      productName = PRODUCT_NAME,
    ) {
      const queryClient = createTestQueryClient()
      const onOpenChange = vi.fn()

      const view = render(
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ProductImageDialog
              productId={productId}
              productName={productName}
              onOpenChange={onOpenChange}
            />
          </I18nextProvider>
        </QueryClientProvider>,
      )

      return {
        queryClient,
        onOpenChange,
        close: () => {
          view.rerender(
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={i18n}>
                <ProductImageDialog
                  productId={null}
                  productName={productName}
                  onOpenChange={onOpenChange}
                />
              </I18nextProvider>
            </QueryClientProvider>,
          )
        },
      }
    }

    it("shows the loading state while the photo is requested", async () => {
      let resolveImage: (response: Response) => void = () => undefined
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        return new Promise<Response>((resolve) => {
          resolveImage = resolve
        })
      })

      renderDialog()

      expect(await screen.findByText("Loading the photo...")).toBeInTheDocument()

      await act(async () => {
        resolveImage(binaryResponse(200, IMAGE_BYTES))
      })
    })

    it("shows the empty state when the product has no photo", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS_WITHOUT_IMAGE))
        }

        return Promise.resolve(jsonResponse(404, { message: "image not found" }))
      })

      renderDialog()

      expect(
        await screen.findByText("The product has no photo"),
      ).toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("shows the photo with an accessible name", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        return Promise.resolve(binaryResponse(200, IMAGE_BYTES))
      })

      renderDialog()

      const image = await screen.findByRole("img", {
        name: `Photo of the product ${PRODUCT_NAME}`,
      })
      expect(image.getAttribute("src")).toContain("blob:")
    })

    it("shows the error message when the photo request fails", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        return Promise.resolve(
          jsonResponse(500, { message: "internal server error" }),
        )
      })

      renderDialog()

      expect(
        await screen.findByText("internal server error"),
      ).toBeInTheDocument()
    })

    it("enables replace and delete after a successful upload", async () => {
      let uploaded = false
      fetchMock.mockImplementation((input, init) => {
        const method = methodOf(init)
        const url = urlOf(input)

        if (method === "GET" && url.endsWith("/products")) {
          return Promise.resolve(
            jsonResponse(200, uploaded ? PRODUCTS : PRODUCTS_WITHOUT_IMAGE),
          )
        }

        if (method === "GET") {
          return Promise.resolve(
            uploaded
              ? binaryResponse(200, IMAGE_BYTES)
              : jsonResponse(404, { message: "image not found" }),
          )
        }

        if (method === "POST") {
          uploaded = true
          return Promise.resolve(jsonResponse(201, { id: IMAGE_ID }))
        }

        return Promise.resolve(new Response(null, { status: 204 }))
      })

      const user = userEvent.setup()
      renderDialog()

      expect(
        await screen.findByText("The product has no photo"),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Replace photo" }),
      ).not.toBeInTheDocument()

      await user.upload(
        screen.getByLabelText("Image file"),
        new File([IMAGE_BYTES], "photo.png", { type: "image/png" }),
      )
      await user.click(screen.getByRole("button", { name: "Upload photo" }))

      expect(
        await screen.findByRole("button", { name: "Replace photo" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Delete photo" }),
      ).toBeInTheDocument()
    })

    it("shows only the upload action while the product has no photo", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS_WITHOUT_IMAGE))
        }

        return Promise.resolve(jsonResponse(404, { message: "image not found" }))
      })

      renderDialog()

      await screen.findByText("The product has no photo")

      expect(
        screen.getByRole("button", { name: "Upload photo" }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Replace photo" }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Delete photo" }),
      ).not.toBeInTheDocument()
    })

    it("hides the upload action and keeps the file selection while the product has a photo", async () => {
      let uploaded = false
      fetchMock.mockImplementation((input, init) => {
        const method = methodOf(init)
        const url = urlOf(input)

        if (method === "GET" && url.endsWith("/products")) {
          return Promise.resolve(
            jsonResponse(200, uploaded ? PRODUCTS : PRODUCTS_WITHOUT_IMAGE),
          )
        }

        if (method === "GET") {
          return Promise.resolve(
            uploaded
              ? binaryResponse(200, IMAGE_BYTES)
              : jsonResponse(404, { message: "image not found" }),
          )
        }

        if (method === "POST") {
          uploaded = true
          return Promise.resolve(jsonResponse(201, { id: IMAGE_ID }))
        }

        return Promise.resolve(new Response(null, { status: 204 }))
      })

      const user = userEvent.setup()
      renderDialog()

      await screen.findByText("The product has no photo")
      await user.upload(
        screen.getByLabelText("Image file"),
        new File([IMAGE_BYTES], "photo.png", { type: "image/png" }),
      )
      await user.click(screen.getByRole("button", { name: "Upload photo" }))

      await screen.findByRole("button", { name: "Replace photo" })

      expect(
        screen.queryByRole("button", { name: "Upload photo" }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByLabelText("Image file"),
      ).toBeEnabled()

      await user.upload(
        screen.getByLabelText("Image file"),
        new File([IMAGE_BYTES], "replacement.png", { type: "image/png" }),
      )
      await user.click(screen.getByRole("button", { name: "Replace photo" }))

      await waitFor(() =>
        expect(
          fetchMock.mock.calls.filter(
            ([, init]) => methodOf(init) === "PUT",
          ),
        ).toHaveLength(1),
      )
      expect(
        fetchMock.mock.calls.filter(([, init]) => methodOf(init) === "POST"),
      ).toHaveLength(1)
    })

    it("hides the error of a failed operation after another operation succeeds", async () => {
      fetchMock.mockImplementation((input, init) => {
        const method = methodOf(init)
        const url = urlOf(input)

        if (method === "GET" && url.endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        if (method === "GET") {
          return Promise.resolve(binaryResponse(200, IMAGE_BYTES))
        }

        if (method === "DELETE") {
          return Promise.resolve(
            jsonResponse(500, { message: "internal server error" }),
          )
        }

        return Promise.resolve(new Response(null, { status: 204 }))
      })

      const user = userEvent.setup()
      renderDialog()

      await screen.findByRole("img", {
        name: `Photo of the product ${PRODUCT_NAME}`,
      })

      await user.click(
        screen.getByRole("button", { name: "Delete photo" }),
      )
      await user.click(
        await screen.findByRole("button", {
          name: `Delete the photo of ${PRODUCT_NAME}`,
        }),
      )

      expect(
        await screen.findByText("internal server error"),
      ).toBeInTheDocument()

      await user.upload(
        screen.getByLabelText("Image file"),
        new File([IMAGE_BYTES], "replacement.png", { type: "image/png" }),
      )
      await user.click(screen.getByRole("button", { name: "Replace photo" }))

      await waitFor(() =>
        expect(
          screen.queryByText("internal server error"),
        ).not.toBeInTheDocument(),
      )
    })

    it("releases the temporary object url when the dialog closes", async () => {
      const revokeSpy = vi.spyOn(URL, "revokeObjectURL")
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        return Promise.resolve(binaryResponse(200, IMAGE_BYTES))
      })

      const { close } = renderDialog()

      const image = await screen.findByRole("img", {
        name: `Photo of the product ${PRODUCT_NAME}`,
      })
      const src = image.getAttribute("src")

      expect(src).toContain("blob:")
      expect(revokeSpy).not.toHaveBeenCalled()

      close()

      await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith(src))
    })

    it("keeps the selected file and the form open after a failed upload", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS_WITHOUT_IMAGE))
        }

        if (methodOf(init) === "POST") {
          return Promise.resolve(jsonResponse(400, { message: "empty image" }))
        }

        return Promise.resolve(jsonResponse(404, { message: "image not found" }))
      })

      const user = userEvent.setup()
      renderDialog()

      await screen.findByText("The product has no photo")
      const input = screen.getByLabelText("Image file")
      await user.upload(
        input,
        new File([IMAGE_BYTES], "photo.png", { type: "image/png" }),
      )
      await user.click(screen.getByRole("button", { name: "Upload photo" }))

      expect(await screen.findByText("empty image")).toBeInTheDocument()
      expect((input as HTMLInputElement).files?.[0]?.name).toBe("photo.png")
      expect(
        screen.getByRole("button", { name: "Upload photo" }),
      ).toBeInTheDocument()
    })

    it("blocks the upload until a valid file is selected", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS_WITHOUT_IMAGE))
        }

        return Promise.resolve(jsonResponse(404, { message: "image not found" }))
      })

      const user = userEvent.setup()
      renderDialog()

      await screen.findByText("The product has no photo")
      await user.click(screen.getByRole("button", { name: "Upload photo" }))

      expect(
        await screen.findByText("Select an image file"),
      ).toBeInTheDocument()
      expect(
        fetchMock.mock.calls.filter(
          ([, init]) => methodOf(init) === "POST",
        ),
      ).toHaveLength(0)
    })

    it("rejects a file that is larger than the server limit", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS_WITHOUT_IMAGE))
        }

        return Promise.resolve(jsonResponse(404, { message: "image not found" }))
      })

      const user = userEvent.setup()
      renderDialog()

      await screen.findByText("The product has no photo")
      await user.upload(
        screen.getByLabelText("Image file"),
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", {
          type: "image/png",
        }),
      )
      await user.click(screen.getByRole("button", { name: "Upload photo" }))

      expect(
        await screen.findByText("The image must not exceed 10 MiB"),
      ).toBeInTheDocument()
      expect(
        fetchMock.mock.calls.filter(
          ([, init]) => methodOf(init) === "POST",
        ),
      ).toHaveLength(0)
    })

    it("does not send the delete request when the confirmation is cancelled", async () => {
      fetchMock.mockImplementation((input, init) => {
        if (methodOf(init) === "GET" && urlOf(input).endsWith("/products")) {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        if (methodOf(init) === "GET") {
          return Promise.resolve(binaryResponse(200, IMAGE_BYTES))
        }

        return Promise.resolve(new Response(null, { status: 204 }))
      })

      const user = userEvent.setup()
      renderDialog()

      await user.click(
        await screen.findByRole("button", { name: "Delete photo" }),
      )
      await user.click(
        await screen.findByRole("button", { name: "Cancel" }),
      )

      expect(
        fetchMock.mock.calls.filter(
          ([, init]) => methodOf(init) === "DELETE",
        ),
      ).toHaveLength(0)
    })
  })

  describe("products page", () => {
    it("opens the photo dialog for the chosen product", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, PRODUCTS))
      const queryClient = createTestQueryClient()
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ProductsListPage />
          </I18nextProvider>
        </QueryClientProvider>,
      )

      await user.click(
        await screen.findByRole("button", {
          name: `Actions for ${PRODUCT_NAME}`,
        }),
      )
      await user.click(
        await screen.findByRole("menuitem", {
          name: `Manage the photo of ${PRODUCT_NAME}`,
        }),
      )

      const dialog = await screen.findByRole("dialog")
      expect(
        within(dialog).getByText(`Photo of the product ${PRODUCT_NAME}.`),
      ).toBeInTheDocument()
    })
  })

  describe("resolveProductImageError", () => {
    const translate = (key: string) => i18n.t(key)

    it("returns the server message of a 400 response", () => {
      expect(
        resolveProductImageError(new ApiError(400, "empty image"), translate),
      ).toBe("empty image")
    })

    it("falls back to the invalid request text when a 400 response has no message", () => {
      expect(resolveProductImageError(new ApiError(400), translate)).toBe(
        i18n.t("errors.invalidRequest"),
      )
    })

    it("falls back to the image not found text when a 404 response has no message", () => {
      expect(resolveProductImageError(new ApiError(404), translate)).toBe(
        i18n.t("errors.imageNotFound"),
      )
    })

    it("falls back to the server error text when a response has no message", () => {
      expect(resolveProductImageError(new ApiError(500), translate)).toBe(
        i18n.t("errors.server"),
      )
    })

    it("reports a network failure", () => {
      expect(
        resolveProductImageError(
          new NetworkError(new TypeError("Failed to fetch")),
          translate,
        ),
      ).toBe(i18n.t("errors.network"))
    })

    it("returns nothing for a 401 response", () => {
      expect(
        resolveProductImageError(
          new ApiError(401, "invalid or expired token"),
          translate,
        ),
      ).toBeNull()
    })
  })
})
