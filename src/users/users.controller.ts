// daon-backend/src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 👤 1. 관리자 신규 등록
  @Post()
  create(@Body() createUserDto: Prisma.UserCreateInput) {
    return this.usersService.create(createUserDto);
  }

  // 📋 2. 전체 관리자 리스트 조회
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // 🔑 [핵심 수정] 이 부분이 누락되었거나 id 변환이 안 되어서 404/500 에러가 났을 확률이 높습니다.
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateData: Prisma.UserUpdateInput
  ) {
    // 🌟 중요: URL 매개변수로 들어오는 id는 문자열("1")이기 때문에 
    // 앞에 붙인 덧셈 기호(+)나 Number(id)를 통해 반드시 숫자로 변환하여 Prisma에 넘겨줘야 합니다!
    return this.usersService.update(+id, updateData);
  }

  // ❌ 4. 관리자 계정 삭제
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}