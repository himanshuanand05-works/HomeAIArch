import { ErrorCode, ErrorCodeValue } from './error-codes';

export interface ConstraintViolation {
  constraint: string;
  room?: string;
  expected?: string;
  actual?: string;
  hint?: string;
}

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCodeValue;
  abstract readonly httpStatus: number;
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export class ResourceNotFoundError extends DomainError {
  readonly code = ErrorCode.RESOURCE_NOT_FOUND;
  readonly httpStatus = 404;
}

export class ConflictError extends DomainError {
  readonly code = ErrorCode.CONFLICT;
  readonly httpStatus = 409;
}

export class UnauthorizedError extends DomainError {
  readonly code = ErrorCode.UNAUTHORIZED;
  readonly httpStatus = 401;
}

export class UnsolvableLayoutError extends DomainError {
  readonly code = ErrorCode.UNSOLVABLE_LAYOUT;
  readonly httpStatus = 422;

  constructor(message: string, violations: ConstraintViolation[]) {
    super(message, violations);
  }
}

export class InvalidChangeRequestError extends DomainError {
  readonly code = ErrorCode.INVALID_CHANGE_REQUEST;
  readonly httpStatus = 400;
}
