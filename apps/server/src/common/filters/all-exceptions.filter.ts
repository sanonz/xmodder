import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { IResponseWithError } from '../../types/response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // const request = ctx.getRequest<Request>();

    let status: number;
    let errorCode: string;
    let message: string;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object') {
        const errorObj = errorResponse as any;
        message = errorObj.message || exception.message;
        errorCode = errorObj.error || HttpStatus[status] || 'UNKNOWN_ERROR';
        details = errorObj.details;
      } else {
        message = errorResponse as string;
        errorCode = HttpStatus[status] || 'UNKNOWN_ERROR';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      message = 'Internal server error';
      
      // 在开发环境下显示详细错误信息
      if (process.env.NODE_ENV === 'development') {
        details = exception instanceof Error ? exception.stack : exception;
      }
    }

    const errorResponse: IResponseWithError = {
      success: false,
      error: {
        code: errorCode,
        message: Array.isArray(message) ? message.join(', ') : message,
        ...(details && { details }),
      },
    };

    response.status(status).json(errorResponse);
  }
}
