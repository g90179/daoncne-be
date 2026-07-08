// daon-backend/src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common'; // 🔑 Query 추가
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: Prisma.UserCreateInput) {
    return this.usersService.create(createUserDto);
  }

  // 📋 2. 전체 관리자 리스트 조회 (호출 유저 패러미터 리스닝)
  @Get()
  findAll(@Query('requestingEmail') requestingEmail?: string) {
    // 🔑 서비스 단으로 요청자 이메일 릴레이 토스
    return this.usersService.findAll(requestingEmail);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: Prisma.UserUpdateInput) {
    return this.usersService.update(+id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}