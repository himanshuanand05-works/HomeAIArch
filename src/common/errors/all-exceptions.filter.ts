import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { DomainError } from './domain-errors';
import { ErrorCode, ErrorCodeValue } from './error-codes';
import { RequestWithId } from '../middleware/request-id.middleware';

interface ErrorBody {
  statusCode: number;
  code: ErrorCodeValue;
  message: string;
  details?: unknown;
  traceId: string;
}

interface ValidationFieldError {
  property: string;
  constraints: Record<string, string>;
}

function isValidationFieldErrorList(value: unknown): value is ValidationFieldError[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' && item !== null && 'property' in item && 'constraints' in item,
    )
  );
}

function isPrismaError(value: unknown): value is { code?: string } {
  return typeof value === 'object' && value !== null && 'code' in value;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const traceId = request.id ?? randomUUID();
    const body = this.toErrorBody(exception, traceId);

    if (body.statusCode >= 500) {
      this.logger.error(
        `traceId=${traceId} ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    }
    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, traceId: string): ErrorBody {
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        details: exception.details ?? undefined,
        traceId,
      };
    }

    if (exception instanceof ZodError) {
      return {
        statusCode: 400,
        code: ErrorCode.VALIDATION,
        message: 'Invalid request payload',
        details: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        traceId,
      };
    }

    if (exception instanceof BadRequestException) {
      const body = exception.getResponse();
      const maybeList =
        typeof body === 'object' && body !== null
          ? (body as { message?: unknown }).message
          : undefined;
      if (isValidationFieldErrorList(maybeList)) {
        return {
          statusCode: 400,
          code: ErrorCode.VALIDATION,
          message: 'Invalid request payload',
          details: maybeList.map((field) => ({
            property: field.property,
            constraints: Object.values(field.constraints),
          })),
          traceId,
        };
      }
    }

    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        code: this.codeForStatus(exception.getStatus()),
        message: exception.message,
        traceId,
      };
    }

    if (isPrismaError(exception)) {
      if (exception.code === 'P2002') {
        return {
          statusCode: 409,
          code: ErrorCode.CONFLICT,
          message: 'Resource already exists',
          traceId,
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: 404,
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'Resource not found',
          traceId,
        };
      }
    }

    return {
      statusCode: 500,
      code: ErrorCode.INTERNAL,
      message: 'Internal server error',
      traceId,
    };
  }

  private codeForStatus(status: number): ErrorCodeValue {
    switch (status) {
      case 400:
        return ErrorCode.VALIDATION;
      case 401:
      case 403:
        return ErrorCode.UNAUTHORIZED;
      case 404:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case 409:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.INTERNAL;
    }
  }
}
