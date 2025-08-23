import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginationQueryDto, SortableQueryDto } from '../dto/pagination.dto';
import { IResponsePagination, IResponseWithPagination } from '../../types/response';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: IResponsePagination;
}

@Injectable()
export class PaginationService {
  /**
   * 通用分页查询方法
   * @param repository TypeORM Repository
   * @param options 分页选项
   * @param queryBuilderCallback 可选的查询构建器回调，用于添加额外查询条件
   * @returns 分页结果
   */
  async paginate<T extends ObjectLiteral>(
    repository: Repository<T>,
    options: PaginationOptions,
    queryBuilderCallback?: (queryBuilder: SelectQueryBuilder<T>) => SelectQueryBuilder<T>
  ): Promise<PaginationResult<T>> {
    const { page, limit, sortBy, sortOrder } = options;

    // 计算跳过的记录数
    const skip = (page - 1) * limit;

    // 创建查询构建器
    const alias = repository.metadata.name.toLowerCase();
    let queryBuilder = repository.createQueryBuilder(alias);

    // 应用自定义查询条件
    if (queryBuilderCallback) {
      queryBuilder = queryBuilderCallback(queryBuilder);
    }

    // 应用排序
    if (sortBy) {
      const sortColumn = sortBy.includes('.') ? sortBy : `${alias}.${sortBy}`;
      queryBuilder.orderBy(sortColumn, sortOrder || 'DESC');
    }

    // 应用分页
    queryBuilder.skip(skip).take(limit);

    // 执行查询
    const [data, total] = await queryBuilder.getManyAndCount();

    // 计算总页数
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 构建标准分页响应
   * @param result 分页结果
   * @param message 可选的消息
   * @returns 标准化的分页响应
   */
  buildPaginationResponse<T>(
    result: PaginationResult<T>,
    message?: string
  ): IResponseWithPagination<T[]> {
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: message || '查询成功',
    };
  }

  /**
   * 从DTO创建分页选项
   * @param dto 分页查询DTO
   * @returns 分页选项
   */
  createOptionsFromDto(dto: PaginationQueryDto): PaginationOptions {
    return {
      page: dto.page || 1,
      limit: dto.limit || 10,
      sortBy: (dto as SortableQueryDto).sortBy,
      sortOrder: (dto as SortableQueryDto).sortOrder || 'DESC',
    };
  }

  /**
   * 验证和规范化分页参数
   * @param page 页码
   * @param limit 每页数量
   * @returns 规范化的分页参数
   */
  normalizePagination(page?: number, limit?: number): { page: number; limit: number } {
    const normalizedPage = Math.max(1, page || 1);
    const normalizedLimit = Math.min(100, Math.max(1, limit || 10));

    return {
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }
}
