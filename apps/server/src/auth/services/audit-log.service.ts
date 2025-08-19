import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AuditLog, AuditEventType } from '../entities/audit-log.entity';

export interface AuditLogData {
  userId?: string;
  eventType: AuditEventType;
  target?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  details?: any;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * 记录审计日志
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create(data);
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // 审计日志记录失败不应该影响主业务流程
      console.error('Failed to save audit log:', error);
    }
  }

  /**
   * 记录权限拒绝事件
   */
  async logPermissionDenied(
    userId: string,
    requiredRoles: string[],
    userRoles: string[],
    resource: string,
    request: Request,
  ): Promise<void> {
    await this.log({
      userId,
      eventType: AuditEventType.PERMISSION_DENIED,
      target: resource,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: false,
      details: {
        requiredRoles,
        userRoles,
        method: request.method,
        path: request.path,
        query: request.query,
      },
    });
  }

  /**
   * 记录权限授予事件
   */
  async logAccessGranted(
    userId: string,
    userRoles: string[],
    resource: string,
    request: Request,
  ): Promise<void> {
    await this.log({
      userId,
      eventType: AuditEventType.ACCESS_GRANTED,
      target: resource,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: true,
      details: {
        userRoles,
        method: request.method,
        path: request.path,
      },
    });
  }

  /**
   * 记录角色分配事件
   */
  async logRoleAssigned(
    operatorId: string,
    targetUserId: string,
    assignedRoles: string[],
    request: Request,
  ): Promise<void> {
    await this.log({
      userId: operatorId,
      eventType: AuditEventType.ROLE_ASSIGNED,
      target: targetUserId,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: true,
      details: {
        assignedRoles,
        targetUserId,
      },
    });
  }

  /**
   * 记录角色移除事件
   */
  async logRoleRemoved(
    operatorId: string,
    targetUserId: string,
    removedRoles: string[],
    request: Request,
  ): Promise<void> {
    await this.log({
      userId: operatorId,
      eventType: AuditEventType.ROLE_REMOVED,
      target: targetUserId,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: true,
      details: {
        removedRoles,
        targetUserId,
      },
    });
  }

  /**
   * 记录角色创建事件
   */
  async logRoleCreated(
    operatorId: string,
    roleName: string,
    roleData: any,
    request: Request,
  ): Promise<void> {
    await this.log({
      userId: operatorId,
      eventType: AuditEventType.ROLE_CREATED,
      target: roleName,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: true,
      details: roleData,
    });
  }

  /**
   * 记录角色更新事件
   */
  async logRoleUpdated(
    operatorId: string,
    roleName: string,
    changes: any,
    request: Request,
  ): Promise<void> {
    await this.log({
      userId: operatorId,
      eventType: AuditEventType.ROLE_UPDATED,
      target: roleName,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: true,
      details: changes,
    });
  }

  /**
   * 记录角色删除事件
   */
  async logRoleDeleted(
    operatorId: string,
    roleName: string,
    request: Request,
  ): Promise<void> {
    await this.log({
      userId: operatorId,
      eventType: AuditEventType.ROLE_DELETED,
      target: roleName,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: true,
    });
  }

  /**
   * 记录权限提升尝试事件
   */
  async logPrivilegeEscalationAttempt(
    userId: string,
    attemptedAction: string,
    request: Request,
  ): Promise<void> {
    await this.log({
      userId,
      eventType: AuditEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      target: attemptedAction,
      ipAddress: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      success: false,
      details: {
        attemptedAction,
        method: request.method,
        path: request.path,
        body: request.body,
      },
    });
  }

  /**
   * 查询权限相关的审计日志
   */
  async getPermissionAuditLogs(
    userId?: string,
    eventTypes?: AuditEventType[],
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (userId) {
      query.andWhere('audit.userId = :userId', { userId });
    }

    if (eventTypes && eventTypes.length > 0) {
      query.andWhere('audit.eventType IN (:...eventTypes)', { eventTypes });
    }

    if (startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    return query
      .orderBy('audit.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * 获取权限统计信息
   */
  async getPermissionStatistics(days: number = 30): Promise<{
    permissionDeniedCount: number;
    accessGrantedCount: number;
    roleChangesCount: number;
    topDeniedResources: Array<{ resource: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      permissionDeniedCount,
      accessGrantedCount,
      roleChangesCount,
      topDeniedResources,
    ] = await Promise.all([
      this.auditLogRepository.count({
        where: {
          eventType: AuditEventType.PERMISSION_DENIED,
          createdAt: { $gte: startDate } as any,
        },
      }),
      this.auditLogRepository.count({
        where: {
          eventType: AuditEventType.ACCESS_GRANTED,
          createdAt: { $gte: startDate } as any,
        },
      }),
      this.auditLogRepository.count({
        where: {
          eventType: [AuditEventType.ROLE_ASSIGNED, AuditEventType.ROLE_REMOVED] as any,
          createdAt: { $gte: startDate } as any,
        },
      }),
      this.auditLogRepository
        .createQueryBuilder('audit')
        .select('audit.target as resource, COUNT(*) as count')
        .where('audit.eventType = :eventType', { eventType: AuditEventType.PERMISSION_DENIED })
        .andWhere('audit.createdAt >= :startDate', { startDate })
        .groupBy('audit.target')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      permissionDeniedCount,
      accessGrantedCount,
      roleChangesCount,
      topDeniedResources: topDeniedResources.map(item => ({
        resource: item.resource || 'unknown',
        count: parseInt(item.count),
      })),
    };
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
