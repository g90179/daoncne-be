import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  // 1. 유저 전체 조회
  @Get()
  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, createdAt: true },
    });
  }

  // 2. 유저 생성 (계정 추가)
  @Post()
  async create(@Body() data: { email: string; password: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password, // 실제 서비스 시에는 암호화 필수!
      },
    });
  }

  // 3. 유저 삭제
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.user.delete({
      where: { id: Number(id) },
    });
  }
}