export interface ApiErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: unknown;
  readonly cause?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details ?? null;
    this.cause = options.cause;
  }
}
