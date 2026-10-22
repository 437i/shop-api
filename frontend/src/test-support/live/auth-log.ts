/**
 * Разбор лога сервиса `auth`: поиск записи о сбросе пароля.
 *
 * Почтовой инфраструктуры в стенде нет, поэтому новый пароль публикуется в логах
 * сервиса. Разбор вынесен в чистую функцию: он не обращается к Docker, не печатает
 * лог и проверяется unit-тестом.
 */

/** Метка успешного сброса пароля в логе сервиса `auth`. */
const RESET_MARKER = "password reset success for user: "

/** Метка нового пароля в логе сервиса `auth`. */
const PASSWORD_MARKER = /New password: ([A-Za-z0-9]+)/

/**
 * Ищет новый пароль по записи о сбросе в указанном пользователе.
 *
 * @param log полный вывод лога сервиса `auth`
 * @param email email пользователя, чей пароль сбрасывали
 * @param offset смещение в логе, с которого начинается поиск: всё до него —
 *   записи предыдущих прогонов, их следует игнорировать
 */
export function findResetPassword(
  log: string,
  email: string,
  offset = 0,
): string | null {
  const slice = log.slice(Math.max(0, offset))
  const wanted = email.trim().toLowerCase()
  const lines = slice.split("\n")

  let resetIndex = -1
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.toLowerCase() ?? ""
    if (line.includes(`${RESET_MARKER}${wanted}`)) {
      resetIndex = index
      break
    }
  }
  if (resetIndex < 0) return null

  for (const line of lines.slice(resetIndex + 1)) {
    const match = PASSWORD_MARKER.exec(line)
    if (match?.[1]) return match[1]
  }
  return null
}
