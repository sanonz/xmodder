import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CryptoService {
  /**
   * 使用 Argon2id 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,       // 3 iterations
      parallelism: 4,    // 4 parallel threads
    });
  }

  /**
   * 验证密码
   */
  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
      return false;
    }
  }

  /**
   * 哈希验证码
   */
  async hashVerificationCode(code: string): Promise<string> {
    return argon2.hash(code, {
      type: argon2.argon2id,
      memoryCost: 32768, // 32 MB (lighter for verification codes)
      timeCost: 2,       // 2 iterations
      parallelism: 2,    // 2 parallel threads
    });
  }

  /**
   * 验证验证码
   */
  async verifyVerificationCode(hashedCode: string, plainCode: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedCode, plainCode);
    } catch (error) {
      return false;
    }
  }

  /**
   * 哈希刷新令牌
   */
  async hashToken(token: string): Promise<string> {
    return argon2.hash(token, {
      type: argon2.argon2id,
      memoryCost: 32768, // 32 MB
      timeCost: 2,       // 2 iterations
      parallelism: 2,    // 2 parallel threads
    });
  }

  /**
   * 验证刷新令牌
   */
  async verifyToken(hashedToken: string, plainToken: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedToken, plainToken);
    } catch (error) {
      return false;
    }
  }
}
