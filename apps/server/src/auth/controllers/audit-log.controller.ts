import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../decorators';
import { SystemRole } from '../services/role.service';
import { AuditLogService } from '../services/audit-log.service';
import { AuditEventType } from '../entities/audit-log.entity';
import type { IResponseBody } from '../../types/response';

@ApiTags('Admin - Audit Logs')
@Controller('admin/audit-logs')
@Roles(SystemRole.ADMIN)
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'Get permission-related audit logs' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type', enum: AuditEventType })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Permission audit logs retrieved successfully',
  })
  async getPermissionAuditLogs(
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: string,
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ): Promise<IResponseBody<any[]>> {
    const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
    const eventTypes = eventType ? [eventType as AuditEventType] : [
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.ACCESS_GRANTED,
      AuditEventType.ROLE_ASSIGNED,
      AuditEventType.ROLE_REMOVED,
      AuditEventType.ROLE_CREATED,
      AuditEventType.ROLE_UPDATED,
      AuditEventType.ROLE_DELETED,
      AuditEventType.PRIVILEGE_ESCALATION_ATTEMPT,
    ];

    const logs = await this.auditLogService.getPermissionAuditLogs(
      userId,
      eventTypes,
      startDate,
      undefined,
      limit || 100,
    );

    return {
      success: true,
      data: logs,
    };
  }

  @Get('permissions/statistics')
  @ApiOperation({ summary: 'Get permission statistics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Permission statistics retrieved successfully',
  })
  async getPermissionStatistics(
    @Query('days') days?: number,
  ): Promise<IResponseBody<any>> {
    const statistics = await this.auditLogService.getPermissionStatistics(days || 30);

    return {
      success: true,
      data: statistics,
    };
  }

  @Get('permissions/denied')
  @ApiOperation({ summary: 'Get permission denied events' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Permission denied events retrieved successfully',
  })
  async getPermissionDeniedEvents(
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ): Promise<IResponseBody<any[]>> {
    const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

    const logs = await this.auditLogService.getPermissionAuditLogs(
      undefined,
      [AuditEventType.PERMISSION_DENIED, AuditEventType.PRIVILEGE_ESCALATION_ATTEMPT],
      startDate,
      undefined,
      limit || 100,
    );

    return {
      success: true,
      data: logs,
    };
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get role-related audit logs' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Role audit logs retrieved successfully',
  })
  async getRoleAuditLogs(
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ): Promise<IResponseBody<any[]>> {
    const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

    const logs = await this.auditLogService.getPermissionAuditLogs(
      undefined,
      [
        AuditEventType.ROLE_ASSIGNED,
        AuditEventType.ROLE_REMOVED,
        AuditEventType.ROLE_CREATED,
        AuditEventType.ROLE_UPDATED,
        AuditEventType.ROLE_DELETED,
      ],
      startDate,
      undefined,
      limit || 100,
    );

    return {
      success: true,
      data: logs,
    };
  }
}
