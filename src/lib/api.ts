import 'server-only'

const MAX_JSON_BYTES = 16 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id')
  return incoming && /^[a-zA-Z0-9._-]{1,80}$/.test(incoming)
    ? incoming
    : crypto.randomUUID()
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('application/json')) {
    throw new ApiError(415, 'Content-Type phải là application/json', 'UNSUPPORTED_MEDIA_TYPE')
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new ApiError(413, 'Dữ liệu gửi lên quá lớn', 'PAYLOAD_TOO_LARGE')
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    throw new ApiError(400, 'Không đọc được dữ liệu gửi lên', 'INVALID_BODY')
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) {
    throw new ApiError(413, 'Dữ liệu gửi lên quá lớn', 'PAYLOAD_TOO_LARGE')
  }

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new ApiError(400, 'JSON không hợp lệ', 'INVALID_JSON')
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Dữ liệu gửi lên không hợp lệ', 'INVALID_BODY')
  }
  return value as Record<string, unknown>
}

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ApiError(400, `${field} không hợp lệ`, 'INVALID_ID')
  }
  return value
}

export function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} không hợp lệ`, 'INVALID_TEXT')
  }
  const result = value.trim()
  if (result.length > maxLength) {
    throw new ApiError(400, `${field} tối đa ${maxLength} ký tự`, 'TEXT_TOO_LONG')
  }
  return result || null
}

export function requireFiniteNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ApiError(400, `${field} phải là số từ ${min} đến ${max}`, 'INVALID_NUMBER')
  }
  return value
}

export function apiSuccess(requestId: string, data?: Record<string, unknown>, status = 200) {
  return Response.json({ ok: true, ...(data ? { data } : {}), requestId }, { status })
}

export function apiFailure(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message }, requestId },
      { status: error.status },
    )
  }

  console.error(`[${requestId}] Unhandled API error`, error)
  return Response.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Có lỗi máy chủ' }, requestId },
    { status: 500 },
  )
}
