// src/visitor/visitor.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitorService {
  constructor(private prisma: PrismaService) {}

  async logVisitor(req: any, body: { path: string }) {
    // Cloudflare Containers 뒤에서는 X-Forwarded-For 가 Cloudflare 내부 네트워크 주소
    // (10.x.x.x)로 덮어써져서 실제 방문자 IP를 안 담고 있다 - Cloudflare가 항상 실제 클라이언트
    // IP를 넣어주는 CF-Connecting-IP 헤더를 우선 쓴다(Gabia 시절 프록시 뒤에선 이 헤더가 없어서
    // x-forwarded-for로 자연히 폴백된다).
    const cfIp = req.headers['cf-connecting-ip'];
    const forwardedFor = req.headers['x-forwarded-for'];
    const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim();
    const rawIp = cfIp || firstForwarded || req.ip || req.connection?.remoteAddress;
    const ip = (Array.isArray(rawIp) ? rawIp[0] : rawIp)?.replace(/^::ffff:/, '') || '127.0.0.1';

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