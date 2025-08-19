import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    comment: 'Hashed refresh token',
  })
  tokenHash: string;

  @Column({
    type: 'uuid',
  })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'timestamp',
    comment: 'Token expiration time',
  })
  expiresAt: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Device identifier',
  })
  deviceId: string | null;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    comment: 'User agent string',
  })
  userAgent: string | null;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address',
  })
  ipAddress: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last used timestamp',
  })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
