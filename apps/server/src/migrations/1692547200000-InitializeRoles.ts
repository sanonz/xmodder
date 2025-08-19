import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeRoles1692547200000 implements MigrationInterface {
  name = 'InitializeRoles1692547200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 插入系统默认角色
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, "isActive", "createdAt", "updatedAt") VALUES 
      (gen_random_uuid(), 'ADMIN', '管理员角色，拥有所有权限', true, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ System roles initialized successfully');
    console.log('✅ All existing users assigned USER role');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 清除用户角色关联
    await queryRunner.query(`
      DELETE FROM user_roles
      WHERE role_id IN (
        SELECT id FROM roles WHERE name IN ('ADMIN')
      );
    `);

    // 删除系统角色
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('ADMIN');
    `);

    console.log('✅ System roles removed');
  }
}
