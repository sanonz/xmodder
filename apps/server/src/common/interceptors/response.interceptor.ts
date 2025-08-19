import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IResponseBody } from '../../types/response';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, IResponseBody<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<IResponseBody<T>> {
    // const request = context.switchToHttp().getRequest();
    // const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // 如果响应已经是标准格式，直接返回
        if (typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 标准化响应格式
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
