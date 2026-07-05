import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  // 회사 정보는 단일 레코드(id=1)로 관리
  async getCompanyInfo() {
    const company = await this.prisma.company.findUnique({
      where: { id: 1 },
    });
    return company;
  }

  async upsertCompanyInfo(data: {
    name?: string;
    ceo?: string;
    bizNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
    lat?: number;
    lng?: number;
  }) {
    const company = await this.prisma.company.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return company;
  }
}