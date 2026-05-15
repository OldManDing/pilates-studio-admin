import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { localizeErrorDetails, localizeErrorMessage } from '../utils/localized-error-message';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorResponse.error.message = localizeErrorMessage(exceptionResponse);
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        errorResponse.error = {
          code: res.error || this.getErrorCode(status),
          message: localizeErrorMessage(res.message || exception.message),
          details: localizeErrorDetails(res.details),
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack);
      errorResponse.error.message =
        process.env.NODE_ENV === 'production'
          ? '服务器内部错误'
          : localizeErrorMessage(exception.message);
    }

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${errorResponse.error.message}`,
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }
}
