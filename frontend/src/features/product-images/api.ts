import { apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type CreateImageResponse = components["schemas"]["internal_image.CreateResponse"]

export async function fetchProductImage(productId: string): Promise<Blob> {
  return apiClient.getBinary(`/products/${productId}/image`)
}

export async function uploadProductImage(
  productId: string,
  file: Blob,
): Promise<CreateImageResponse> {
  return apiClient.postBinary<CreateImageResponse>(
    `/products/${productId}/image`,
    file,
  )
}

export async function replaceProductImage(
  imageId: string,
  file: Blob,
): Promise<void> {
  return apiClient.putBinary<void>(`/images/${imageId}`, file)
}

export async function deleteProductImage(imageId: string): Promise<void> {
  return apiClient.delete<void>(`/images/${imageId}`)
}
