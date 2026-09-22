import { ApiError } from '@/api/client';
import { t } from '@/i18n/he';

/**
 * Turns anything thrown into something worth showing a person.
 *
 * The server phrases its own failures, so those are passed through. Everything else falls back
 * to a plain sentence rather than a status code.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t.errors.network;
    if (error.status === 401) return t.errors.unauthorized;
    if (error.status === 403) return t.errors.forbidden;
    if (error.message) return error.message;
  }
  return t.common.somethingWentWrong;
}
