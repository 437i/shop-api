export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

export type ImageFileValidationKey =
  | "productImages.validation.fileRequired"
  | "productImages.validation.fileEmpty"
  | "productImages.validation.fileTooLarge"

export function validateImageFile(file: File | null): ImageFileValidationKey | null {
  if (!file) {
    return "productImages.validation.fileRequired"
  }

  if (file.size === 0) {
    return "productImages.validation.fileEmpty"
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "productImages.validation.fileTooLarge"
  }

  return null
}
