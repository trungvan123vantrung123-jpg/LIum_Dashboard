import 'server-only'

import { ApiError } from './api'

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')

  // Non-browser/internal callers may omit Origin. Authentication remains the
  // mandatory security boundary once staff sessions are configured.
  if (!origin) return
  if (!host) throw new ApiError(403, 'Không xác minh được nguồn yêu cầu', 'INVALID_ORIGIN')

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new ApiError(403, 'Nguồn yêu cầu không hợp lệ', 'INVALID_ORIGIN')
  }

  if (originHost.toLowerCase() !== host.toLowerCase()) {
    throw new ApiError(403, 'Yêu cầu khác nguồn đã bị chặn', 'CROSS_ORIGIN_REQUEST')
  }
}
