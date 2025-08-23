# 通用分页功能使用指南

## 概述
本项目实现了一套通用的分页功能，包括分页参数验证、分页查询服务和标准化的分页响应。

## 核心组件

### 1. 分页参数 DTO

#### PaginationQueryDto
基础分页参数，包含页码和每页数量：

```typescript
import { PaginationQueryDto } from '../common/dto/pagination.dto';

class MyQueryDto extends PaginationQueryDto {
  // 可以继承并添加其他查询参数
}
```

#### SortableQueryDto
扩展的分页参数，包含排序功能：

```typescript
import { SortableQueryDto } from '../common/dto/pagination.dto';

// 在控制器中使用
@Get()
async getItems(@Query() queryDto: SortableQueryDto) {
  // queryDto 包含: page, limit, sortBy, sortOrder
}
```

### 2. 分页服务 (PaginationService)

#### 基本用法

```typescript
import { PaginationService } from '../common/services/pagination.service';

@Controller('items')
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get()
  async getItems(@Query() queryDto: SortableQueryDto) {
    const options = this.paginationService.createOptionsFromDto(queryDto);
    
    const result = await this.paginationService.paginate(
      this.itemService.getRepository(),
      options
    );

    return this.paginationService.buildPaginationResponse(result);
  }
}
```

#### 添加查询条件

```typescript
@Get()
async getItems(
  @Query() queryDto: SortableQueryDto,
  @Query('search') search?: string,
  @Query('status') status?: string,
) {
  const options = this.paginationService.createOptionsFromDto(queryDto);
  
  const result = await this.paginationService.paginate(
    this.itemService.getRepository(),
    options,
    (queryBuilder) => {
      // 添加搜索条件
      if (search) {
        queryBuilder.where('item.name LIKE :search', { search: `%${search}%` });
      }
      
      // 添加状态筛选
      if (status) {
        queryBuilder.andWhere('item.status = :status', { status });
      }
      
      // 添加关联查询
      queryBuilder
        .leftJoinAndSelect('item.category', 'category')
        .leftJoinAndSelect('item.tags', 'tags');
      
      return queryBuilder;
    }
  );

  return this.paginationService.buildPaginationResponse(result, '查询成功');
}
```

#### 选择特定字段

```typescript
const result = await this.paginationService.paginate(
  this.userService.getUserRepository(),
  options,
  (queryBuilder) => {
    // 只选择需要的字段，排除敏感信息
    queryBuilder.select([
      'user.id',
      'user.email',
      'user.username',
      'user.nickname',
      'user.isActive',
      'user.createdAt',
    ]);
    
    return queryBuilder;
  }
);
```

### 3. 响应格式

分页响应遵循标准的 `IResponseWithPagination` 接口：

```typescript
{
  "success": true,
  "data": [
    // 数据数组
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  },
  "message": "查询成功"
}
```

## 在服务中添加 Repository 访问方法

为了使用分页服务，你的服务类需要提供访问 Repository 的方法：

```typescript
@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  // 其他业务方法...

  /**
   * 获取仓库实例（用于分页服务）
   */
  getRepository(): Repository<Item> {
    return this.itemRepository;
  }
}
```

## 在模块中注册依赖

确保在模块中导入 `CommonModule`：

```typescript
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item]),
    CommonModule, // 导入通用模块以使用分页服务
  ],
  controllers: [ItemController],
  providers: [ItemService],
  exports: [ItemService],
})
export class ItemModule {}
```

## API 文档示例

使用 Swagger 装饰器完善 API 文档：

```typescript
@Get()
@ApiOperation({ summary: '获取项目列表' })
@ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
@ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
@ApiQuery({ name: 'sortBy', required: false, description: '排序字段', example: 'createdAt' })
@ApiQuery({ name: 'sortOrder', required: false, description: '排序方向', enum: ['ASC', 'DESC'] })
@ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
@ApiResponse({
  status: 200,
  description: '项目列表查询成功',
  schema: {
    example: {
      success: true,
      data: [
        {
          id: 'uuid',
          name: '项目名称',
          status: 'active',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5
      },
      message: '查询成功'
    }
  }
})
async getItems(@Query() queryDto: SortableQueryDto) {
  // 实现...
}
```

## 高级用法

### 复杂查询示例

```typescript
const result = await this.paginationService.paginate(
  this.itemService.getRepository(),
  options,
  (queryBuilder) => {
    queryBuilder
      // 关联查询
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.user', 'user')
      // 复杂条件
      .where('item.isActive = :isActive', { isActive: true })
      .andWhere('category.type IN (:...types)', { types: ['type1', 'type2'] })
      // 搜索条件
      .andWhere(
        new Brackets(qb => {
          qb.where('item.name LIKE :search', { search: `%${search}%` })
            .orWhere('item.description LIKE :search', { search: `%${search}%` });
        })
      )
      // 日期范围
      .andWhere('item.createdAt BETWEEN :startDate AND :endDate', {
        startDate: startDate,
        endDate: endDate
      });
    
    return queryBuilder;
  }
);
```

### 自定义分页逻辑

```typescript
// 直接使用分页选项
const customOptions: PaginationOptions = {
  page: 2,
  limit: 20,
  sortBy: 'title',
  sortOrder: 'ASC'
};

const result = await this.paginationService.paginate(
  repository,
  customOptions,
  queryBuilderCallback
);
```

## 注意事项

1. **性能优化**: 对于大数据集，建议在数据库层面创建适当的索引
2. **字段选择**: 使用 `select()` 方法只查询必要的字段，避免加载敏感信息
3. **参数验证**: 分页参数已包含基本验证，页码最小为1，每页数量最大为100
4. **错误处理**: 分页服务会自动处理边界情况，如页码超出范围等

这个通用分页系统提供了灵活性和标准化，可以轻松应用到项目中的任何实体列表查询。
