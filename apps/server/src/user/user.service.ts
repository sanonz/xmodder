import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CryptoService } from '../common/services/crypto.service';
import { ValidationUtils } from '../common/utils/validation.utils';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 创建新用户
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, phone, password, username, nickname, avatar } = createUserDto;

    // 验证邮箱或手机号至少有一个
    if (!ValidationUtils.hasEmailOrPhone(email, phone)) {
      throw new ConflictException('Email or phone number is required');
    }

    // 标准化邮箱和手机号
    const normalizedEmail = email ? ValidationUtils.normalizeEmail(email) : null;
    const normalizedPhone = phone ? ValidationUtils.normalizePhoneNumber(phone) : null;

    // 检查用户名是否已存在
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // 检查邮箱是否已存在
    if (normalizedEmail) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // 检查手机号是否已存在
    if (normalizedPhone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // 哈希密码
    const hashedPassword = await this.cryptoService.hashPassword(password);

    // 创建用户
    const user = this.userRepository.create({
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      username,
      nickname,
      avatar,
    });

    return await this.userRepository.save(user);
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = ValidationUtils.normalizeEmail(email);
    return await this.userRepository.findOne({
      where: { email: normalizedEmail, deletedAt: IsNull() },
    });
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone: string): Promise<User | null> {
    const normalizedPhone = ValidationUtils.normalizePhoneNumber(phone);
    return await this.userRepository.findOne({
      where: { phone: normalizedPhone, deletedAt: IsNull() },
    });
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { username, deletedAt: IsNull() },
    });
  }

  /**
   * 根据邮箱或手机号查找用户
   */
  async findByEmailOrPhone(email?: string, phone?: string): Promise<User | null> {
    if (!email && !phone) {
      return null;
    }

    const conditions: any[] = [];

    if (email) {
      const normalizedEmail = ValidationUtils.normalizeEmail(email);
      conditions.push({ email: normalizedEmail });
    }

    if (phone) {
      const normalizedPhone = ValidationUtils.normalizePhoneNumber(phone);
      conditions.push({ phone: normalizedPhone });
    }

    return await this.userRepository.findOne({
      where: conditions,
    });
  }

  /**
   * 更新用户信息
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { email, phone, username, nickname, avatar } = updateUserDto;

    // 标准化邮箱和手机号
    const normalizedEmail = email ? ValidationUtils.normalizeEmail(email) : undefined;
    const normalizedPhone = phone ? ValidationUtils.normalizePhoneNumber(phone) : undefined;

    // 检查用户名冲突
    if (username && username !== user.username) {
      const existingUsername = await this.userRepository.findOne({
        where: { username },
      });
      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    // 检查邮箱冲突
    if (normalizedEmail && normalizedEmail !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // 检查手机号冲突
    if (normalizedPhone && normalizedPhone !== user.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // 更新用户信息
    await this.userRepository.update(id, {
      email: normalizedEmail,
      phone: normalizedPhone,
      username,
      nickname,
      avatar,
    });

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }
    
    return updatedUser;
  }

  /**
   * 验证用户密码
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return await this.cryptoService.verifyPassword(user.password, password);
  }

  /**
   * 更新用户密码
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.cryptoService.hashPassword(newPassword);
    await this.userRepository.update(id, { password: hashedPassword });
  }

  /**
   * 软删除用户
   */
  async softDelete(id: string): Promise<void> {
    await this.userRepository.update(id, { deletedAt: new Date() });
  }

  /**
   * 恢复软删除的用户
   */
  async restore(id: string): Promise<void> {
    await this.userRepository.update(id, { deletedAt: null });
  }

  /**
   * 禁用用户
   */
  async deactivate(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }

  /**
   * 启用用户
   */
  async activate(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: true });
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, { emailVerified: true });
  }

  /**
   * 验证手机号
   */
  async verifyPhone(id: string): Promise<void> {
    await this.userRepository.update(id, { phoneVerified: true });
  }
}
