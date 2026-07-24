// src/visitor/visitor.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitorService {
  constructor(private prisma: PrismaService) {}

  async logVisitor(req: any, body: { path: string }) {
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress;
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp?.replace(/^.*:/, '') || '127.0.0.1';

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

    return await this.prisma.visitorLog.create({
      data: {
        ip,
        region: '대한민국',
        device,
        keyword,
        path: body?.path || '/',
      },
    });
  }

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