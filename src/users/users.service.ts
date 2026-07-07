// daon-backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // 🌟 프로젝트의 PrismaService 실제 경로에 맞게 수정해 주세요
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs'; // 🔑 아까 교체한 bcryptjs 사용

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 👤 신규 계정 생성 (비밀번호 암호화 포함)
  async create(data: Prisma.UserCreateInput): Promise<User> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  // 🛠️ 계정 정보 수정 (비밀번호 입력 시만 선별적 암호화)
  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    const updateData = { ...data };

    if (updateData.password && typeof updateData.password === 'string') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  // 📋 전체 관리자 리스트 조회 (보안을 위해 패스워드 필드는 제외하고 전송)
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  // 🔍 로그인 검증용 단일 이메일 조회 (패스워드 포함 복구)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // ❌ 계정 삭제
  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}