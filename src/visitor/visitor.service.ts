// src/visitor/visitor.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service'; // 프로젝트 내 PrismaService 경로에 맞게 조정하세요

@Injectable()
export class VisitorService {
  constructor(private prisma: PrismaService) {}

  async logVisitor(req: any, body: { path: string }) {
    // 1. 클라이언트 IP 추출
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress;
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp?.replace(/^.*:/, '') || '127.0.0.1';

    // 2. 접속 기기 및 레퍼러(검색 키워드 유추)
    const device = req.headers['user-agent'] || '알 수 없음';
    const referer = req.headers['referer'] || '';
    
    let keyword = '직접 방문 / 기타';
    if (referer) {
      try {
        const url = new URL(referer);
        if (url.hostname.includes('naver.com')) {
          keyword = url.searchParams.get('query') || '네이버 유입';
        } else if (url.hostname.includes('google.com')) {
          keyword = url.searchParams.get('q') || '구글 유입';
        } else {
          keyword = url.hostname;
        }
      } catch (err) {
        keyword = referer;
      }
    }

    // 3. Prisma를 통한 DB 저장
    return await this.prisma.visitorLog.create({
      data: {
        ip,
        region: '대한민국', // 별도 라이브러리 없이 안전하게 처리
        device,
        keyword,
        path: body?.path || '/',
      },
    });
  }

  // 관리자용 로그 목록 조회 (최신순)
  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.visitorLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.visitorLog.count(),
    ]);
    return { data, total };
  }
}