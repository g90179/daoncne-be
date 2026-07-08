// daon-backend/src/policies/policies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Policy, Prisma } from '@prisma/client';

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  // 📝 1. 약관 등록 (노출 상태 제어 자동화 포함)
  async create(data: Prisma.PolicyCreateInput): Promise<Policy> {
    if (data.isExposed === true) {
      await this.deactivateOthers(data.type);
    }
    return this.prisma.policy.create({ data });
  }

  // 🛠️ 2. 약관 수정
  async update(id: number, data: Prisma.PolicyUpdateInput): Promise<Policy> {
    const current = await this.prisma.policy.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('존재하지 않는 문서입니다.');

    if (data.isExposed === true) {
      await this.deactivateOthers(data.type as string || current.type);
    }

    return this.prisma.policy.update({
      where: { id },
      data,
    });
  }

  // 📋 3. 전체 목록 조회 (타입별 선별 필터 지원)
  async findAll(type?: string): Promise<Policy[]> {
    return this.prisma.policy.findMany({
      where: type ? { type } : {},
      orderBy: { id: 'desc' },
    });
  }

  // 🌍 4. 일반 유저 노출용 활성 약관 단독 조회 (Public API 대응)
  async findExposed(type: string): Promise<Policy | null> {
    return this.prisma.policy.findFirst({
      where: { type, isExposed: true },
    });
  }

  // ❌ 5. 약관 삭제
  async remove(id: number) {
    return this.prisma.policy.delete({ where: { id } });
  }

  // 🔒 [내부 보조 메서드] 동일 타입 문서들의 활성 상태를 일제 차단(false) 처리
  private async deactivateOthers(type: string): Promise<void> {
    await this.prisma.policy.updateMany({
      where: { type, isExposed: true },
      data: { isExposed: false },
    });
  }
}