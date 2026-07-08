// daon-backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 👤 신규 계정 생성 (비밀번호 암호화 포함)
  async create(data: Prisma.UserCreateInput): Promise<User> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // 🔑 저장 전 전화번호 하이픈 제거
    const cleanPhone = data.phone ? data.phone.replace(/-/g, '') : data.phone;

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        phone: cleanPhone,
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

    // 🔑 수정 저장 전 전화번호 하이픈 제거
    if (updateData.phone && typeof updateData.phone === 'string') {
      updateData.phone = updateData.phone.replace(/-/g, '');
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
        name: true,
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

  // 🔑 [신규 이식 1] 5분 유효 인스턴스 키 발급 시 DB 스냅샷 갱신
  async updateResetKey(userId: number, resetKey: string, expiresAt: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        resetKey,
        resetKeyExpires: expiresAt,
      },
    });
  }

  // 🔑 [신규 이식 2] 비밀번호 최종 변경 시 암호화된 패스워드 주입 및 인증 키 일제 청소(null)
  async updatePasswordAndClearResetKey(userId: number, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetKey: null,
        resetKeyExpires: null,
      },
    });
  }
}