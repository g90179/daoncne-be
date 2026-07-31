// daon-backend/src/brochure/brochure.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

const FEATURED_COUNT = 8;

// ✨ 팔레트 (회사소개 페이지 톤과 맞춤)
const COLOR = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  accent: '#3b82f6',
  ink: '#0f172a',
  sub: '#64748b',
  faint: '#94a3b8',
  badgeBg: '#0f172a',
  badgeText: '#ffffff',
  pillBg: '#eff6ff',
  pillText: '#2563eb',
};

@Injectable()
export class BrochureService {
  constructor(private readonly prisma: PrismaService) {}

  private stripHtml(html: string = ''): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private fontPath(name: string) {
    return path.join(process.cwd(), 'assets', 'fonts', name);
  }

  async generate(res: Response) {
    const [company, posts] = await Promise.all([
      this.prisma.company.findFirst(),
      this.prisma.post.findMany({
        orderBy: { id: 'desc' },
        include: { files: true },
      }),
    ]);

    const featured = posts.slice(0, FEATURED_COUNT);
    const rest = posts.slice(FEATURED_COUNT);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="daoncne-brochure-${new Date().toISOString().slice(0, 10)}.pdf"`,
    );
    doc.pipe(res);

    doc.registerFont('KR', this.fontPath('NotoSansKR-Regular.ttf'));
    doc.registerFont('KR-Bold', this.fontPath('NotoSansKR-Bold.ttf'));

    this.renderCover(doc, company);

    doc.addPage();
    this.fillPageBg(doc);
    this.renderCompanyInfo(doc, company);

    doc.addPage();
    this.fillPageBg(doc);
    this.renderFeaturedPortfolio(doc, featured);

    if (rest.length > 0) {
      doc.addPage();
      this.fillPageBg(doc);
      this.renderPortfolioList(doc, rest);
    }

    doc.end();
  }

  // ── 공용 드로잉 헬퍼 ──────────────────────────────

  private fillPageBg(doc: PDFKit.PDFDocument) {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLOR.bg);
    doc.fillColor(COLOR.ink); // 이후 텍스트 색 리셋
  }

  // 회사소개 페이지의 "파란 좌측 바 + 굵은 제목" 헤더를 재해석
  private drawSectionHeader(doc: PDFKit.PDFDocument, title: string, x = 50) {
    const y = doc.y;
    doc.rect(x, y + 2, 3, 14).fill(COLOR.accent);
    doc.fillColor(COLOR.ink).font('KR-Bold').fontSize(14).text(title, x + 12, y);
    doc.moveDown(1.2);
  }

  // 둥근 흰 카드 배경을 그리고, 카드 내부 콘텐츠 시작 y를 반환
  private drawCardBg(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
    doc.roundedRect(x, y, width, height, 14).fill(COLOR.card).strokeColor(COLOR.border).lineWidth(1).roundedRect(x, y, width, height, 14).stroke();
  }

  // 검정 필 뱃지 (예: "SUCCESS", 카테고리 등)
  private drawBadge(doc: PDFKit.PDFDocument, text: string, x: number, y: number, opts?: { bg?: string; color?: string }) {
    const bg = opts?.bg || COLOR.badgeBg;
    const color = opts?.color || COLOR.badgeText;
    doc.font('KR-Bold').fontSize(8);
    const w = doc.widthOfString(text) + 16;
    doc.roundedRect(x, y, w, 16, 8).fill(bg);
    doc.fillColor(color).text(text, x, y + 4, { width: w, align: 'center' });
    return w;
  }

  // 연도 라벨용 검정 필 (연도별 실적 헤더와 동일한 톤)
  private drawYearPill(doc: PDFKit.PDFDocument, year: string, x: number, y: number) {
    doc.font('KR-Bold').fontSize(10);
    const label = `${year} PERFORMANCE`;
    const w = doc.widthOfString(label) + 24;
    doc.roundedRect(x, y, w, 22, 10).fill(COLOR.badgeBg);
    doc.fillColor(COLOR.badgeText).text(label, x, y + 6, { width: w, align: 'center' });
    return w;
  }

  // ── 페이지별 렌더링 ──────────────────────────────

  private renderCover(doc: PDFKit.PDFDocument, company: any) {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
    doc.fillColor('#60a5fa').font('KR-Bold').fontSize(11)
      .text('DAON C&E COMPANY BROCHURE', 50, 120);
    doc.fillColor('#ffffff').font('KR-Bold').fontSize(30)
      .text(company?.name || '다온씨엔이', 50, 148, { width: 420 });
    doc.fillColor('#94a3b8').font('KR').fontSize(10)
      .text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 50, 205);
    doc.fillColor('#cbd5e1').font('KR').fontSize(9)
      .text('본 문서는 다운로드 시점의 최신 정보를 기준으로 자동 생성됩니다.', 50, doc.page.height - 80, { width: 420 });
  }

  // "기업 개요 명세" 카드를 재해석: 흰 카드 + 파란 헤더 바 + label/value 행
  private renderCompanyInfo(doc: PDFKit.PDFDocument, company: any) {
    this.drawSectionHeader(doc, '기업 개요 명세');

    const rows: [string, string][] = [
      ['회사명', company?.name || '-'],
      ['대표자', company?.ceo || '-'],
      ['사업자등록번호', company?.bizNumber || '-'],
      ['소재지', [company?.address, company?.addressDetail].filter(Boolean).join(' ') || '-'],
      ['전화', company?.phone || '-'],
      ['이메일', company?.email || '-'],
      ['팩스', company?.fax || '-'],
    ];

    const cardX = 50;
    const cardW = doc.page.width - 100;
    const rowH = 30;
    const cardH = rows.length * rowH + 24;
    const cardY = doc.y;

    this.drawCardBg(doc, cardX, cardY, cardW, cardH);

    let rowY = cardY + 16;
    rows.forEach(([label, value], idx) => {
      doc.font('KR').fontSize(10).fillColor(COLOR.sub)
        .text(label, cardX + 20, rowY + 8, { width: 130 });
      doc.font('KR-Bold').fontSize(10).fillColor(COLOR.ink)
        .text(value, cardX + 160, rowY + 8, { width: cardW - 200, align: 'right' });

      if (idx < rows.length - 1) {
        doc.moveTo(cardX + 20, rowY + rowH - 4)
          .lineTo(cardX + cardW - 20, rowY + rowH - 4)
          .strokeColor(COLOR.border).lineWidth(0.5).stroke();
      }
      rowY += rowH;
    });

    doc.y = cardY + cardH + 24;
  }

  // "장비보유현황" 테이블 느낌을 개별 카드 리스트(썸네일+제목+뱃지)로 재해석
  private renderFeaturedPortfolio(doc: PDFKit.PDFDocument, posts: any[]) {
    this.drawSectionHeader(doc, '최근 프로젝트');

    posts.forEach((post) => {
      const cardH = 96;
      if (doc.y + cardH > doc.page.height - 50) {
        doc.addPage();
        this.fillPageBg(doc);
      }

      const cardX = 50;
      const cardW = doc.page.width - 100;
      const cardY = doc.y;

      this.drawCardBg(doc, cardX, cardY, cardW, cardH);

      // 썸네일 (원형 마스크 대신 라운드 사각형으로 카드 톤 유지)
      const imageFile = post.files?.find((f: any) => f.type === 'image');
      const thumbX = cardX + 16;
      const thumbY = cardY + (cardH - 64) / 2;
      if (imageFile) {
        try {
          const imgPath = path.join(process.cwd(), 'uploads', path.basename(imageFile.url));
          if (fs.existsSync(imgPath)) {
            doc.save();
            doc.roundedRect(thumbX, thumbY, 64, 64, 10).clip();
            doc.image(imgPath, thumbX, thumbY, { width: 64, height: 64, fit: [64, 64] });
            doc.restore();
          }
        } catch (e) {
          // 미지원 이미지 포맷은 건너뜀
        }
      } else {
        doc.roundedRect(thumbX, thumbY, 64, 64, 10).fill('#f1f5f9');
      }

      // 텍스트 블록
      const textX = thumbX + 64 + 20;
      const textW = cardW - (textX - cardX) - 100;
      doc.font('KR-Bold').fontSize(11).fillColor(COLOR.ink)
        .text(post.title, textX, cardY + 16, { width: textW });

      const dateLabel = post.workYear
        ? `${post.workYear}.${post.workMonth || ''}`
        : new Date(post.createdAt).toLocaleDateString('ko-KR');
      doc.font('KR').fontSize(8).fillColor(COLOR.sub)
        .text(`발주/시공사: ${post.clientName || '미지정'}   ·   ${dateLabel}`, textX, doc.y + 4, { width: textW });

      const summary = this.stripHtml(post.content).slice(0, 60);
      if (summary) {
        doc.font('KR').fontSize(8).fillColor(COLOR.faint)
          .text(summary, textX, doc.y + 4, { width: textW });
      }

      // 우측 카테고리 뱃지 (연도별 실적의 "SUCCESS" 뱃지 톤)
      const badgeText = post.category || 'PROJECT';
      doc.font('KR-Bold').fontSize(8);
      const badgeW = doc.widthOfString(badgeText) + 16;
      this.drawBadge(doc, badgeText, cardX + cardW - badgeW - 16, cardY + 16, {
        bg: COLOR.pillBg,
        color: COLOR.pillText,
      });

      doc.y = cardY + cardH + 14;
    });
  }

  // "연도별 공실적" 탭 구조(검정 필 헤더 + 카드 그리드)를 그대로 재해석
  private renderPortfolioList(doc: PDFKit.PDFDocument, posts: any[]) {
    this.drawSectionHeader(doc, '연도별 시공 실적');

    const grouped = new Map<string, any[]>();
    posts.forEach((post) => {
      const year = post.workYear ? String(post.workYear) : String(new Date(post.createdAt).getFullYear());
      if (!grouped.has(year)) grouped.set(year, []);
      grouped.get(year)!.push(post);
    });

    const years = Array.from(grouped.keys()).sort((a, b) => Number(b) - Number(a));
    const cardX = 50;
    const cardW = doc.page.width - 100;
    const itemH = 40;

    years.forEach((year) => {
      if (doc.y + 50 > doc.page.height - 50) {
        doc.addPage();
        this.fillPageBg(doc);
      }

      this.drawYearPill(doc, year, cardX, doc.y);
      doc.y += 34;

      grouped.get(year)!.forEach((post) => {
        if (doc.y + itemH > doc.page.height - 50) {
          doc.addPage();
          this.fillPageBg(doc);
        }

        const itemY = doc.y;
        this.drawCardBg(doc, cardX, itemY, cardW, itemH);

        doc.font('KR-Bold').fontSize(9.5).fillColor(COLOR.ink)
          .text(post.title, cardX + 18, itemY + 9, { width: cardW - 180 });
        doc.font('KR').fontSize(8).fillColor(COLOR.sub)
          .text(`발주/시공사: ${post.clientName || '미지정'}`, cardX + 18, itemY + 24, { width: cardW - 180 });

        this.drawBadge(doc, 'SUCCESS', cardX + cardW - 90, itemY + 12, {
          bg: '#f8fafc',
          color: COLOR.faint,
        });

        doc.y = itemY + itemH + 8;
      });

      doc.y += 12;
    });
  }
}