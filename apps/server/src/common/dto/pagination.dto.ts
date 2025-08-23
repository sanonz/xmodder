import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({
    description: '页码，从1开始',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: '页码必须是正整数' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: '每页数量必须是正整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能超过100' })
  limit?: number = 10;
}

export class SortableQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: '排序字段',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    description: '排序方向',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
