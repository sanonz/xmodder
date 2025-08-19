import { isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
import { isEmail } from 'validator';

export class ValidationUtils {
  /**
   * 标准化邮箱地址 - 转换为小写并去除空格
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * 标准化手机号 - 转换为E.164格式
   */
  static normalizePhoneNumber(phone: string, defaultCountry: string = 'CN'): string {
    try {
      const phoneNumber = parsePhoneNumberWithError(phone, defaultCountry as any);
      return phoneNumber.format('E.164');
    } catch (error) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }
  }

  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    return isEmail(email);
  }

  /**
   * 验证手机号格式
   */
  static isValidPhoneNumber(phone: string, defaultCountry: string = 'CN'): boolean {
    return isValidPhoneNumber(phone, defaultCountry as any);
  }

  /**
   * 验证密码强度
   */
  static isStrongPassword(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }

  /**
   * 验证用户名格式
   */
  static isValidUsername(username: string): boolean {
    const minLength = 3;
    const maxLength = 20;
    const validFormat = /^[a-zA-Z0-9_]+$/.test(username);

    return (
      username.length >= minLength &&
      username.length <= maxLength &&
      validFormat
    );
  }

  /**
   * 生成6位数字验证码
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 生成设备ID
   */
  static generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 验证验证码格式
   */
  static isValidVerificationCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * 检查邮箱或手机号至少有一个
   */
  static hasEmailOrPhone(email?: string, phone?: string): boolean {
    return !!(email || phone);
  }

  /**
   * 获取客户端IP地址
   */
  static getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '127.0.0.1'
    );
  }

  /**
   * 获取User Agent
   */
  static getUserAgent(request: any): string {
    return request.headers['user-agent'] || 'Unknown';
  }
}
