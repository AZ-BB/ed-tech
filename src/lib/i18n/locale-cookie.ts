export const LOCALE_COOKIE = "NEXT_LOCALE";

export function setLocaleCookie(locale: string) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}
