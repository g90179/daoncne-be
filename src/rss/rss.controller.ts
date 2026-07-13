// daon-backend/src/rss/rss.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import RSS from 'rss';
import { Public } from '../auth/decorators/public.decorator'; // 기존에 만드신 Public 데코레이터

@Controller('rss')
export class RssController {
  constructor(private readonly prisma: PrismaService) {}

  @Public() // 비로그인(구글 검색 봇 등) 접근을 위해 반드시 추가
  @Get()
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async getRssFeed() {
    // 1. RSS 피드 기본 메타 정보 설정
    const feed = new RSS({
      title: '다온씨엔이(DAON C&E)',
      description: '다온씨엔이의 최신 포트폴리오와 소식을 전해드립니다.',
      feed_url: 'https://g90179.gabia.io/rss', // 피드 자체 주소
      site_url: 'https://daoncne.co.kr',
      language: 'ko',
      pubDate: new Date().toUTCString(),
    });

    // 2. Prisma를 이용해 최근 게시글 가져오기 (최신순 20개)
    const posts = await this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20, 
    });

    // 3. 가져온 게시글을 RSS 아이템으로 변환하여 추가
    posts.forEach((post) => {
      feed.item({
        title: post.title,
        // content 안의 HTML 태그가 그대로 RSS 본문으로 들어갑니다.
        description: post.content,
        // 💡 주의: 프론트엔드의 실제 상세 페이지 주소 구조에 맞게 변경해 주세요.
        url: `https://daoncne.co.kr/portfolio/${post.id}`,
        date: post.createdAt,
        // 작성자 정보가 필요하다면 추가
        author: '다온씨엔이',
      });
    });

    // 4. 완성된 XML 문자열 반환
    return feed.xml();
  }
}