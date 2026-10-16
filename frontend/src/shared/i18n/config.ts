import i18next from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en/common.json"
import ru from "./locales/ru/common.json"

export const DEFAULT_LANGUAGE: SupportedLanguage = "en"

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "ru"]

export const LANGUAGE_STORAGE_KEY = "ui_language"

export type SupportedLanguage = "en" | "ru"

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === "en" || value === "ru"
}

function readStoredLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)

  return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { common: en },
    ru: { common: ru },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: ["common"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
})

i18next.on("languageChanged", (language) => {
  if (isSupportedLanguage(language)) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }
})

export default i18next
