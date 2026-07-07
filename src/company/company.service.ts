// daon-backend\src\company\company.service.ts
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
    addressDetail?: string; // 상세주소 필드 추가
    phone?: string;
    email?: string;
    fax?: string;
    lat?: number;
    lng?: number;
  }) {
    // 🔑 [핵심 수정] DB에 들어가기 전, 기존 data 객체를 복사하여 하이픈 제거 전처리를 수행합니다.
    const cleanData = { ...data };

    if (cleanData.phone && typeof cleanData.phone === 'string') {
      cleanData.phone = cleanData.phone.replace(/-/g, '');
    }
    
    if (cleanData.bizNumber && typeof cleanData.bizNumber === 'string') {
      cleanData.bizNumber = cleanData.bizNumber.replace(/-/g, '');
    }

    const company = await this.prisma.company.upsert({
      where: { id: 1 },
      update: cleanData, // 🔑 하이픈이 제거된 깨끗한 데이터 반영
      create: { id: 1, ...cleanData },
    });
    return company;
  }
}