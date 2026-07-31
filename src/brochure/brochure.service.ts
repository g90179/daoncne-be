// daon-backend/src/brochure/brochure.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

// ✨ 최근 몇 건까지 썸네일과 함께 크게 보여줄지 (그 이후는 연도별 간단 목록)
const FEATURED_COUNT = 8;

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
    this.renderCompanyInfo(doc, company);
    doc.addPage();
    this.renderFeaturedPortfolio(doc, featured);
    if (rest.length > 0) {
      doc.addPage();
      this.renderPortfolioList(doc, rest);
    }

    doc.end();
  }

  private renderCover(doc: PDFKit.PDFDocument, company: any) {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
    doc.fillColor('#60a5fa').font('KR-Bold').fontSize(12)
      .text('DAON C&E COMPANY BROCHURE', 50, 120);
    doc.fillColor('#ffffff').font('KR-Bold').fontSize(32)
      .text(company?.name || '다온씨엔이', 50, 150, { width: 400 });
    doc.fillColor('#94a3b8').font('KR').fontSize(11)
      .text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 50, 210);
    doc.fillColor('#cbd5e1').font('KR').fontSize(10)
      .text('본 문서는 다운로드 시점의 최신 정보를 기준으로 자동 생성됩니다.', 50, doc.page.height - 80, { width: 400 });
  }

  private renderCompanyInfo(doc: PDFKit.PDFDocument, company: any) {
    doc.fillColor('#0f172a').font('KR-Bold').fontSize(20).text('회사 소개');
    doc.moveDown(1);

    const rows: [string, string][] = [
      ['대표자', company?.ceo || '-'],
      ['사업자등록번호', company?.bizNumber || '-'],
      ['주소', [company?.address, company?.addressDetail].filter(Boolean).join(' ') || '-'],
      ['전화', company?.phone || '-'],
      ['이메일', company?.email || '-'],
      ['팩스', company?.fax || '-'],
    ];

    doc.font('KR').fontSize(11);
    rows.forEach(([label, value]) => {
      doc.fillColor('#64748b').text(label, { continued: true, width: 120 });
      doc.fillColor('#0f172a').text(`   ${value}`);
      doc.moveDown(0.5);
    });
  }

  private renderFeaturedPortfolio(doc: PDFKit.PDFDocument, posts: any[]) {
    doc.fillColor('#0f172a').font('KR-Bold').fontSize(20).text('최근 프로젝트');
    doc.moveDown(1);

    posts.forEach((post) => {
      if (doc.y > doc.page.height - 220) doc.addPage();

      const imageFile = post.files?.find((f: any) => f.type === 'image');
      const startY = doc.y;

      if (imageFile) {
        try {
          const imgPath = path.join(process.cwd(), 'uploads', path.basename(imageFile.url));
          if (fs.existsSync(imgPath)) {
            doc.image(imgPath, 50, startY, { width: 130, height: 90, fit: [130, 90] });
          }
        } catch (e) {
          // 지원하지 않는 이미지 형식 등은 건너뜀 (예: webp)
        }
      }

      const textX = 200;
      doc.font('KR-Bold').fontSize(13).fillColor('#0f172a')
        .text(post.title, textX, startY, { width: 340 });

      const dateLabel = post.workYear
        ? `${post.workYear}.${post.workMonth || ''}`
        : new Date(post.createdAt).toLocaleDateString('ko-KR');
      doc.font('KR').fontSize(9).fillColor('#3b82f6')
        .text(`${post.category || ''} · ${dateLabel}`, textX, doc.y + 2);

      if (post.clientName) {
        doc.fillColor('#64748b').fontSize(9).text(`의뢰: ${post.clientName}`, textX, doc.y + 2);
      }

      const summary = this.stripHtml(post.content).slice(0, 80);
      doc.fillColor('#334155').fontSize(9).text(summary, textX, doc.y + 4, { width: 340 });

      doc.y = Math.max(doc.y, startY + 100);
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(1);
    });
  }

  private renderPortfolioList(doc: PDFKit.PDFDocument, posts: any[]) {
    doc.fillColor('#0f172a').font('KR-Bold').fontSize(20).text('연도별 시공 실적');
    doc.moveDown(1);

    const grouped = new Map<string, any[]>();
    posts.forEach((post) => {
      const year = post.workYear ? String(post.workYear) : String(new Date(post.createdAt).getFullYear());
      if (!grouped.has(year)) grouped.set(year, []);
      grouped.get(year)!.push(post);
    });

    const years = Array.from(grouped.keys()).sort((a, b) => Number(b) - Number(a));

    years.forEach((year) => {
      if (doc.y > doc.page.height - 100) doc.addPage();
      doc.font('KR-Bold').fontSize(13).fillColor('#2563eb').text(`${year}년`);
      doc.moveDown(0.3);

      grouped.get(year)!.forEach((post) => {
        if (doc.y > doc.page.height - 60) doc.addPage();
        const dateLabel = post.workMonth ? `${post.workMonth}월` : '';
        doc.font('KR').fontSize(10).fillColor('#334155')
          .text(`· ${post.title}  [${post.category}]  ${dateLabel}`, { width: doc.page.width - 100 });
      });
      doc.moveDown(0.8);
    });
  }
}