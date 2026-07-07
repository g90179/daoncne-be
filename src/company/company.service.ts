// daon-backend\src\company\company.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as https from 'https'; // 🔑 Node.js 내장 보안 통신 모듈 임포트

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

  // 🔑 [신규 추가] 국세청 실시간 상태조회 서비스 연동 바인딩
  async checkNtsStatus(bizNumber: string): Promise<string> {
    const cleanNum = bizNumber.replace(/\D/g, ''); // 숫자만 추출
    const serviceKey = process.env.NTS_SERVICE_KEY || '';

    return new Promise((resolve) => {
      if (!serviceKey) {
        resolve('서버 변수 미설정 (NTS_SERVICE_KEY)');
        return;
      }

      const postData = JSON.stringify({ b_no: [cleanNum] });

      const options = {
        hostname: 'api.odcloud.kr',
        path: `/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(serviceKey)}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const resJson = JSON.parse(data);
            if (resJson?.data && resJson.data[0]) {
              // 국세청 반환 값 (예: "부가가치세 일반과세자", "국세청에 등록되지 않은 사업자...")
              const taxType = resJson.data[0].tax_type || '정보 판별 불가';
              const bStt = resJson.data[0].b_stt || ''; // 휴폐업 상태명

              resolve(bStt ? `${taxType} (${bStt})` : taxType);
            } else {
              resolve('등록되지 않은 사업자번호');
            }
          } catch (e) {
            resolve('국세청 데이터 파싱 실패');
          }
        });
      });

      req.on('error', () => {
        resolve('국세청 API 서버 통신 실패');
      });

      req.write(postData);
      req.end();
    });
  }
}