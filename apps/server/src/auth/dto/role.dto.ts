import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称',
    example: 'MODERATOR',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '版主角色，负责内容审核',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiPropertyOptional({
    description: '角色是否激活',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: '角色名称',
    example: 'MODERATOR',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '版主角色，负责内容审核',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiPropertyOptional({
    description: '角色是否激活',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignRolesDto {
  @ApiProperty({
    description: '要分配的角色名称列表',
    example: ['ADMIN', 'MODERATOR'],
    type: [String],
  })
  @IsString({ each: true })
  roles: string[];
}

export class RemoveRolesDto {
  @ApiProperty({
    description: '要移除的角色名称列表',
    example: ['MODERATOR'],
    type: [String],
  })
  @IsString({ each: true })
  roles: string[];
}
