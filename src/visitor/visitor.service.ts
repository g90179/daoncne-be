// src/visitor/visitor.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitorLog } from './entities/visitor-log.entity.ts'; // 혹은 상대 경로 조정
import * as geoip from 'geoip-lite'; // IP 위치 추적용 (선택적 사용 가능)

@Injectable()
vclass VisitorService {
  constructor(
    @InjectRepository(VisitorLog)
    private visitorLogRepository: Repository<VisitorLog>,
  ) {}

  async logVisitor(req: any, body: { path: string }) {
    // 1. 클라이언트 IP 추출
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress;
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp?.replace(/^.*:/, '') || '127.0.0.1';

    // 2. 지역 정보 추적 (geoip-lite 활용 시)
    let region = '알 수 없음';
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        region = `${geo.country} / ${geo.region || ''} ${geo.city || ''}`.trim();
      }
    } catch (e) {
      region = '위치 확인 불가';
    }

    // 3. 디바이스(User-Agent) 및 레퍼러(검색 키워드 유추)
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

    // 4. DB 저장
    const newLog = this.visitorLogRepository.create({
      ip,
      region,
      device,
      keyword,
      path: body?.path || '/',
    });

    return await this.visitorLogRepository.save(newLog);
  }

  // 관리자용 로그 목록 조회 (최신순)
  async findAll(page: number = 1, limit: number = 10) {
    const [data, total] = await this.visitorLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}