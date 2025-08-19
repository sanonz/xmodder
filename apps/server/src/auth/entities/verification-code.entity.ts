import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum VerificationCodePurpose {
  LOGIN = 'login',
  REGISTER = 'register',
  RESET_PASSWORD = 'reset_password',
  CHANGE_EMAIL = 'change_email',
  CHANGE_PHONE = 'change_phone',
  BIND_EMAIL = 'bind_email',
  BIND_PHONE = 'bind_phone',
}

@Entity('verification_codes')
@Index(['target', 'purpose'], { unique: false })
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Email or phone number',
  })
  target: string;

  @Column({
    type: 'text',
    comment: 'Hashed verification code',
  })
  hashedCode: string;

  @Column({
    type: 'enum',
    enum: VerificationCodePurpose,
  })
  purpose: VerificationCodePurpose;

  @Column({
    type: 'timestamp',
    comment: 'Expiration time',
  })
  expiresAt: Date;

  @Column({
    type: 'integer',
    default: 0,
    comment: 'Number of failed attempts',
  })
  attempts: number;

  @Column({
    type: 'integer',
    default: 3,
    comment: 'Maximum allowed attempts',
  })
  maxAttempts: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  used: boolean;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address that requested the code',
  })
  requestIp: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
