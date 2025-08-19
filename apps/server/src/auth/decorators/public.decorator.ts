import { SetMetadata } from '@nestjs/common';

/**
 * 公共接口装饰器
 * 标记不需要任何认证和权限验证的接口
 * 
 * @example
 * ```typescript
 * @Public()
 * @Post('login')
 * async login() {
 *   // 登录接口无需认证
 * }
 * ```
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * 用于检查是否为公共接口的元数据键
 */
export const IS_PUBLIC_KEY = 'isPublic';