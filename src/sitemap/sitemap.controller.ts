import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('sitemap.xml')
export class SitemapController {
  constructor(private readonly prisma: PrismaService) {}

  @Public() // 검색 봇이 접근해야 하므로 인증 제외
  @Get()
  @Header('Content-Type', 'text/xml; charset=utf-8')
  async getSitemap() {
    const baseUrl = 'https://daoncne.co.kr';

    // 1. 고정된 정적 라우트 목록 (프론트엔드 라우터 기준)
    const staticRoutes = [
      '',             // 메인 홈 (/)
      '/company',     // 회사소개
      '/quotes',      // 견적문의
      '/policy'       // 정책관리
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 2. 정적 페이지들을 XML에 추가
    staticRoutes.forEach((route) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${route}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${route === '' ? '1.0' : '0.8'}</priority>\n`;
      xml += `  </url>\n`;
    });

    // 3. DB에서 게시글(포트폴리오) 목록 가져오기
    const posts = await this.prisma.post.findMany({
      select: { id: true, createdAt: true }, // 💡 updatedAt 대신 createdAt으로 변경
      orderBy: { createdAt: 'desc' },
    });

    // 4. 동적 게시글들을 XML에 추가
    posts.forEach((post) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/portfolio/${post.id}</loc>\n`;
      // 💡 post.updatedAt 대신 post.createdAt 사용
      xml += `    <lastmod>${post.createdAt.toISOString().split('T')[0]}</lastmod>\n`; 
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    return xml;
  }
}