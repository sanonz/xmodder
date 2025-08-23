import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { CryptoService } from '../common/services/crypto.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CommonModule,
  ],
  controllers: [UserController],
  providers: [UserService, CryptoService],
  exports: [UserService],
})
export class UserModule {}
