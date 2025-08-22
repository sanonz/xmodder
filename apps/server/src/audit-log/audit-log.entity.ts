import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditEventType {
  // 认证相关事件
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  REGISTER_SUCCESS = 'register_success',
  REGISTER_FAILED = 'register_failed',
  VERIFICATION_CODE_SENT = 'verification_code_sent',
  VERIFICATION_CODE_FAILED = 'verification_code_failed',
  VERIFICATION_CODE_SUCCESS = 'verification_code_success',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  PHONE_CHANGE = 'phone_change',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  REFRESH_TOKEN_USED = 'refresh_token_used',
  REFRESH_TOKEN_REVOKED = 'refresh_token_revoked',
  
  // 权限相关事件
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  PERMISSION_DENIED = 'permission_denied',
  ACCESS_GRANTED = 'access_granted',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['eventType'])
@Index(['ipAddress'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'User ID if applicable',
  })
  userId: string | null;

  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  eventType: AuditEventType;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Target email or phone',
  })
  target: string | null;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address',
  })
  ipAddress: string | null;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    comment: 'User agent string',
  })
  userAgent: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Device identifier',
  })
  deviceId: string | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata: Record<string, any> | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if applicable',
  })
  errorMessage: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  success: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
