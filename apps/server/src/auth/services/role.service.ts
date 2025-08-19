import { Injectable, ConflictException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { Role } from '../entities/role.entity';
import { User } from '../../user/entities/user.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';
import { AuditLogService } from './audit-log.service';

export enum SystemRole {
  ADMIN = 'ADMIN',
}

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 创建新角色
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, description, isActive = true } = createRoleDto;

    // 检查角色名称是否已存在
    const existingRole = await this.roleRepository.findOne({ where: { name } });
    if (existingRole) {
      throw new ConflictException(`Role with name '${name}' already exists`);
    }

    const role = this.roleRepository.create({
      name: name.toUpperCase(),
      description,
      isActive,
    });

    return await this.roleRepository.save(role);
  }

  /**
   * 获取所有角色
   */
  async findAllRoles(): Promise<Role[]> {
    return await this.roleRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 获取激活的角色
   */
  async findActiveRoles(): Promise<Role[]> {
    return await this.roleRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 根据ID获取角色
   */
  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }
    return role;
  }

  /**
   * 根据名称获取角色
   */
  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { name: name.toUpperCase() } });
  }

  /**
   * 根据名称获取角色（如果不存在则抛出异常）
   */
  async findRoleByNameOrFail(name: string): Promise<Role> {
    const role = await this.findRoleByName(name);
    if (!role) {
      throw new NotFoundException(`Role with name '${name}' not found`);
    }
    return role;
  }

  /**
   * 根据名称批量获取角色
   */
  async findRolesByNames(names: string[]): Promise<Role[]> {
    const upperNames = names.map(name => name.toUpperCase());
    return await this.roleRepository.find({
      where: { name: In(upperNames) },
    });
  }

  /**
   * 更新角色
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);

    // 如果更新名称，检查是否与其他角色冲突
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.findRoleByName(updateRoleDto.name);
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException(`Role with name '${updateRoleDto.name}' already exists`);
      }
      updateRoleDto.name = updateRoleDto.name.toUpperCase();
    }

    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  /**
   * 删除角色
   */
  async deleteRole(id: string): Promise<void> {
    const role = await this.findRoleById(id);

    // 防止删除系统预定义角色
    if (Object.values(SystemRole).includes(role.name as SystemRole)) {
      throw new BadRequestException(`Cannot delete system role '${role.name}'`);
    }

    // 检查是否有用户使用此角色
    const usersWithRole = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId: id })
      .getCount();

    if (usersWithRole > 0) {
      throw new BadRequestException(`Cannot delete role '${role.name}' as it is assigned to ${usersWithRole} user(s)`);
    }

    await this.roleRepository.remove(role);
  }

  /**
   * 为用户分配角色
   */
  async assignRolesToUser(userId: string, roleNames: string[], operatorId?: string, request?: Request): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const roles = await this.findRolesByNames(roleNames);
    if (roles.length !== roleNames.length) {
      const foundRoleNames = roles.map(role => role.name);
      const missingRoles = roleNames.filter(name => !foundRoleNames.includes(name.toUpperCase()));
      throw new NotFoundException(`Roles not found: ${missingRoles.join(', ')}`);
    }

    // 检查角色是否已分配
    const existingRoleNames = user.roles.map(role => role.name);
    const newRoles = roles.filter(role => !existingRoleNames.includes(role.name));

    if (newRoles.length > 0) {
      user.roles.push(...newRoles);
      await this.userRepository.save(user);

      // 记录审计日志
      if (operatorId && request) {
        await this.auditLogService.logRoleAssigned(
          operatorId,
          userId,
          newRoles.map(role => role.name),
          request,
        );
      }
    }
  }

  /**
   * 移除用户角色
   */
  async removeRolesFromUser(userId: string, roleNames: string[], operatorId?: string, request?: Request): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const upperRoleNames = roleNames.map(name => name.toUpperCase());
    
    // 防止移除用户的最后一个角色
    const remainingRoles = user.roles.filter(role => !upperRoleNames.includes(role.name));
    if (remainingRoles.length === 0) {
      throw new BadRequestException('Cannot remove all roles from user. User must have at least one role.');
    }

    const removedRoles = user.roles.filter(role => upperRoleNames.includes(role.name));
    user.roles = remainingRoles;
    await this.userRepository.save(user);

    // 记录审计日志
    if (operatorId && request && removedRoles.length > 0) {
      await this.auditLogService.logRoleRemoved(
        operatorId,
        userId,
        removedRoles.map(role => role.name),
        request,
      );
    }
  }

  /**
   * 获取用户的角色
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return user.roles;
  }

  /**
   * 获取用户的角色名称列表
   */
  async getUserRoleNames(userId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId);
    return roles.map(role => role.name);
  }

  /**
   * 检查用户是否拥有指定角色
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const userRoles = await this.getUserRoleNames(userId);
    return userRoles.includes(roleName.toUpperCase());
  }

  /**
   * 检查用户是否拥有任一指定角色
   */
  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const userRoles = await this.getUserRoleNames(userId);
    const upperRoleNames = roleNames.map(name => name.toUpperCase());
    return upperRoleNames.some(roleName => userRoles.includes(roleName));
  }

  /**
   * 获取角色统计信息
   */
  async getRoleStatistics(): Promise<Array<{ role: Role; userCount: number }>> {
    const roles = await this.findAllRoles();
    const statistics: Array<{ role: Role; userCount: number }> = [];

    for (const role of roles) {
      const userCount = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role')
        .where('role.id = :roleId', { roleId: role.id })
        .getCount();

      statistics.push({ role, userCount });
    }

    return statistics;
  }
}
