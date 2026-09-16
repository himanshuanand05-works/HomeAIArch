export type ErrorCode =
  | 'VALIDATION'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'UNSOLVABLE_LAYOUT'
  | 'INVALID_CHANGE_REQUEST'
  | 'INTERNAL';

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
  traceId: string;
}

export interface ValidationIssue {
  path?: string;
  message?: string;
  property?: string;
  constraints?: string[];
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;
  readonly traceId: string | null;

  constructor(body: Partial<ApiErrorBody> & { message: string }) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code ?? 'INTERNAL';
    this.statusCode = body.statusCode ?? 0;
    this.details = body.details;
    this.traceId = body.traceId ?? null;
  }

  get validationIssues(): ValidationIssue[] {
    if (!Array.isArray(this.details)) {
      return [];
    }
    return (this.details as Record<string, string | string[]>[]).map((issue) => ({
      path: typeof issue['path'] === 'string' ? issue['path'] : undefined,
      property: typeof issue['property'] === 'string' ? issue['property'] : undefined,
      message: typeof issue['message'] === 'string' ? issue['message'] : undefined,
      constraints: Array.isArray(issue['constraints'])
        ? (issue['constraints'] as string[])
        : undefined,
    }));
  }

  get constraintViolations(): ConstraintViolationLike[] {
    if (!Array.isArray(this.details)) {
      return [];
    }
    return this.details as ConstraintViolationLike[];
  }
}

export interface ConstraintViolationLike {
  constraint?: string;
  room?: string;
  expected?: string;
  actual?: string;
  hint?: string;
}
