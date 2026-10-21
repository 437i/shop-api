export const MIN_PASSWORD_LENGTH = 5
export const MAX_PASSWORD_BYTES = 72

export function passwordByteLength(value: string): number {
  return new TextEncoder().encode(value).length
}
