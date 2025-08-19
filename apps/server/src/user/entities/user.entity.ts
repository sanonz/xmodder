import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
@Check('email_or_phone_required', '(email IS NOT NULL) OR (phone IS NOT NULL)')
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    transformer: {
      to: (value: string) => value?.toLowerCase().trim(),
      from: (value: string) => value,
    },
  })
  email: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'E.164 format phone number',
  })
  phone: string | null;

  @Column({ type: 'text' })
  @Exclude()
  password: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  nickname: string | null;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  avatar: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  emailVerified: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  phoneVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 软删除时间戳
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  deletedAt: Date | null;
}
