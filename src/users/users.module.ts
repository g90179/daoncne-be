import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller'; // 이 줄 확인
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController], // 여기에 UsersController가 있어야 합니다!
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}