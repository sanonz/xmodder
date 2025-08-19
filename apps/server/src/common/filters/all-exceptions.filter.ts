import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { IResponseWithError } from '../../types/response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorCode: string;
    let message: string;
    let details: any;

    // 处理权限相关异常
    if (exception instanceof ForbiddenException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = 'PERMISSION_DENIED';
      message = exception.message || 'Access denied. Insufficient permissions.';
      
      // 记录权限拒绝的详细信息
      details = {
        path: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: this.getClientIp(request),
        timestamp: new Date().toISOString(),
      };
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      errorCode = 'AUTHENTICATION_REQUIRED';
      message = exception.message || 'Authentication required.';
    } else if (exception instanceof HttpException) {
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

  /**
   * 获取客户端真实IP地址
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
