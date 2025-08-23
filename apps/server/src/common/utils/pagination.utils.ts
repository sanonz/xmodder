import { ApiProperty } from '@nestjs/swagger';
import { IResponsePagination, IResponseWithPagination } from '../../types/response';

/**
 * 分页工具类
 */
export class PaginationUtils {
  /**
   * 计算跳过的记录数
   * @param page 页码
   * @param limit 每页数量
   * @returns 跳过的记录数
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * 计算总页数
   * @param total 总记录数
   * @param limit 每页数量
   * @returns 总页数
   */
  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * 创建分页信息对象
   * @param page 页码
   * @param limit 每页数量
   * @param total 总记录数
   * @returns 分页信息
   */
  static createPaginationInfo(
    page: number,
    limit: number,
    total: number,
  ): IResponsePagination {
    return {
      page,
      limit,
      total,
      totalPages: this.calculateTotalPages(total, limit),
    };
  }

  /**
   * 验证并规范化分页参数
   * @param page 页码
   * @param limit 每页数量
   * @param maxLimit 最大每页数量限制
   * @returns 规范化的分页参数
   */
  static normalizePaginationParams(
    page?: number,
    limit?: number,
    maxLimit: number = 100,
  ): { page: number; limit: number } {
    const normalizedPage = Math.max(1, page || 1);
    const normalizedLimit = Math.min(maxLimit, Math.max(1, limit || 10));
    
    return {
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  /**
   * 检查分页参数是否有效
   * @param page 页码
   * @param limit 每页数量
   * @param maxLimit 最大每页数量限制
   * @returns 验证结果
   */
  static validatePaginationParams(
    page: number,
    limit: number,
    maxLimit: number = 100,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (page < 1) {
      errors.push('页码必须大于等于1');
    }

    if (limit < 1) {
      errors.push('每页数量必须大于等于1');
    }

    if (limit > maxLimit) {
      errors.push(`每页数量不能超过${maxLimit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取分页的元数据信息
   * @param page 当前页码
   * @param limit 每页数量
   * @param total 总记录数
   * @returns 分页元数据
   */
  static getPaginationMetadata(
    page: number,
    limit: number,
    total: number,
  ): {
    pagination: IResponsePagination;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startIndex: number;
    endIndex: number;
  } {
    const totalPages = this.calculateTotalPages(total, limit);
    const startIndex = this.calculateSkip(page, limit);
    const endIndex = Math.min(startIndex + limit - 1, total - 1);

    return {
      pagination: this.createPaginationInfo(page, limit, total),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      startIndex,
      endIndex,
    };
  }
}

/**
 * 分页响应构建器
 */
export class PaginationResponseBuilder {
  /**
   * 构建成功的分页响应
   * @param data 数据数组
   * @param pagination 分页信息
   * @param message 响应消息
   * @returns 分页响应
   */
  static success<T>(
    data: T[],
    pagination: IResponsePagination,
    message?: string,
  ): IResponseWithPagination<T[]> {
    return {
      success: true,
      data,
      pagination,
      message: message || '查询成功',
    };
  }

  /**
   * 构建空结果的分页响应
   * @param page 页码
   * @param limit 每页数量
   * @param message 响应消息
   * @returns 空分页响应
   */
  static empty<T>(
    page: number,
    limit: number,
    message?: string,
  ): IResponseWithPagination<T[]> {
    return {
      success: true,
      data: [],
      pagination: PaginationUtils.createPaginationInfo(page, limit, 0),
      message: message || '暂无数据',
    };
  }
}

/**
 * Swagger 文档用的分页响应示例类
 */
export class PaginationResponseExample {
  @ApiProperty({
    example: true,
    description: '请求是否成功',
  })
  success: boolean;

  @ApiProperty({
    example: [],
    description: '数据数组',
  })
  data: any[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
    },
    description: '分页信息',
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({
    example: '查询成功',
    description: '响应消息',
    required: false,
  })
  message?: string;
}
