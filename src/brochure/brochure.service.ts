// daon-backend/src/brochure/brochure.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

const FEATURED_COUNT = 6; // "최근 프로젝트"에 카드로 보여줄 최대 개수 (한 페이지 기준)

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

interface FitRowsResult {
  rowH: number;
  shown: number;
  remainder: number;
}

@Injectable()
export class BrochureService {
  constructor(private readonly prisma: PrismaService) {}

  private stripHtml(html: string = ''): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private fontPath(name: string) {
    return path.join(process.cwd(), 'assets', 'fonts', name);
  }

  private fitRows(count: number, availableHeight: number, minRowH: number, maxRowH: number): FitRowsResult {
    if (count <= 0) return { rowH: maxRowH, shown: 0, remainder: 0 };

    let rowH = availableHeight / count;
    if (rowH > maxRowH) rowH = maxRowH;

    if (rowH >= minRowH) {
      return { rowH, shown: count, remainder: 0 };
    }

    const maxShown = Math.max(0, Math.floor(availableHeight / minRowH) - 1);
    return { rowH: minRowH, shown: maxShown, remainder: count - maxShown };
  }

  async generate(res: Response) {
    const [company, equipmentPosts, constructionPosts] = await Promise.all([
      this.prisma.company.findFirst(),
      this.prisma.post.findMany({
        where: { category: '보유장비' },
        orderBy: { id: 'desc' },
        include: { files: true, keywords: { include: { keyword: true } } },
      }),
      this.prisma.post.findMany({
        where: { category: '공사실적' },
        orderBy: { id: 'desc' },
        include: { files: true },
      }),
    ]);

    const featured = constructionPosts.slice(0, FEATURED_COUNT);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="daoncne-brochure-${new Date().toISOString().slice(0, 10)}.pdf"`,
    );
    doc.pipe(res);

    doc.registerFont('KR', this.fontPath('NotoSansKR-Regular.ttf'));
    doc.registerFont('KR-Bold', this.fontPath('NotoSansKR-Bold.ttf'));

    // 1. 표지
    this.renderCover(doc, company);

    // 2. 기업 개요
    doc.addPage();
    this.fillPageBg(doc);
    this.renderCompanyInfo(doc, company);

    // 3. 장비보유현황 (4열 그리드 스타일, 페이지당 최대 16개 제한)
    this.renderEquipmentGridPages(doc, equipmentPosts);

    // 4. 최근 프로젝트 (공사실적 상위 6개, 이미지 잘림 방지 적용)
    doc.addPage();
    this.fillPageBg(doc);
    this.renderFeaturedPortfolio(doc, featured);

    // 5. 연도별 시공 실적 (타임라인 스타일 전체 반영)
    if (constructionPosts.length > 0) {
      this.renderTimelinePortfolioPages(doc, constructionPosts);
    }

    doc.end();
  }

  // ── 공용 드로잉 헬퍼 ──────────────────────────────

  private fillPageBg(doc: PDFKit.PDFDocument) {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLOR.bg);
    doc.fillColor(COLOR.ink);
  }

  private drawSectionHeader(doc: PDFKit.PDFDocument, title: string, x = 50) {
    const y = doc.y;
    doc.rect(x, y + 2, 3, 14).fill(COLOR.accent);
    doc.fillColor(COLOR.ink).font('KR-Bold').fontSize(14).text(title, x + 12, y);
    doc.moveDown(1.2);
  }

  private drawCardBg(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
    doc.roundedRect(x, y, width, height, 8).fill(COLOR.card).strokeColor(COLOR.border).lineWidth(1).roundedRect(x, y, width, height, 8).stroke();
  }

  private drawBadge(doc: PDFKit.PDFDocument, text: string, x: number, y: number, opts?: { bg?: string; color?: string; fontSize?: number }) {
    const bg = opts?.bg || COLOR.badgeBg;
    const color = opts?.color || COLOR.badgeText;
    const fontSize = opts?.fontSize || 8;
    doc.font('KR-Bold').fontSize(fontSize);
    const w = doc.widthOfString(text) + 10;
    const h = fontSize + 5;
    doc.roundedRect(x, y, w, h, h / 2).fill(bg);
    doc.fillColor(color).text(text, x, y + h / 2 - fontSize / 2 - 1, { width: w, align: 'center' });
    return w;
  }

  private drawRemainderNote(doc: PDFKit.PDFDocument, x: number, y: number, width: number, remainder: number, fontSize = 9) {
    if (remainder <= 0) return;
    doc.font('KR').fontSize(fontSize).fillColor(COLOR.faint)
      .text(`외 ${remainder}건은 지면 관계상 생략되었습니다.`, x, y, { width, align: 'center' });
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

  // ✨ [신규] 장비보유현황: 4열 그리드 카탈로그 스타일 (페이지당 최대 16개, 이미지 잘림 방지)
  private renderEquipmentGridPages(doc: PDFKit.PDFDocument, posts: any[]) {
    const ITEMS_PER_PAGE = 16; // 페이지당 최대 16개

    if (posts.length === 0) {
      doc.addPage();
      this.fillPageBg(doc);
      this.drawSectionHeader(doc, '장비보유현황');
      doc.font('KR').fontSize(10).fillColor(COLOR.faint)
        .text('등록된 보유 장비가 없습니다.', 50, doc.y);
      return;
    }

    for (let i = 0; i < posts.length; i += ITEMS_PER_PAGE) {
      const pagePosts = posts.slice(i, i + ITEMS_PER_PAGE);

      doc.addPage();
      this.fillPageBg(doc);
      this.drawSectionHeader(doc, '장비보유현황');

      const pageLeft = 50;
      const pageRight = doc.page.width - 50;
      const usableWidth = pageRight - pageLeft; // 495
      
      const cols = 4;
      const rows = 4;
      const gap = 10;
      
      const cardW = (usableWidth - gap * (cols - 1)) / cols; // 약 116.25
      const startY = doc.y;
      const usableHeight = doc.page.height - 50 - startY;
      const cardH = (usableHeight - gap * (rows - 1)) / rows; // 약 155

      pagePosts.forEach((post, index) => {
        const c = index % cols;
        const r = Math.floor(index / cols);

        const x = pageLeft + c * (cardW + gap);
        const y = startY + r * (cardH + gap);

        // 카드 배경 박스
        this.drawCardBg(doc, x, y, cardW, cardH);

        // 1. 장비 이미지 영역 (잘림 방지 fit 적용)
        const imgBoxX = x + 8;
        const imgBoxY = y + 8;
        const imgBoxW = cardW - 16;
        const imgBoxH = cardH * 0.48; // 카드의 약 48% 높이 할당

        const imageFile = post.files?.find((f: any) => f.type === 'image');
        if (imageFile) {
          try {
            const imgPath = path.join(process.cwd(), 'uploads', path.basename(imageFile.url));
            if (fs.existsSync(imgPath)) {
              doc.save();
              doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4).clip();
              // 이미지가 왜곡되거나 잘리지 않도록 fit과 양쪽 정렬 옵션 사용
              doc.image(imgPath, imgBoxX, imgBoxY, { 
                width: imgBoxW, 
                height: imgBoxH, 
                fit: [imgBoxW, imgBoxH], 
                align: 'center', 
                valign: 'center' 
              });
              doc.restore();
            } else {
              doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4).fill('#f1f5f9');
            }
          } catch (e) {
            doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4).fill('#f1f5f9');
          }
        } else {
          doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4).fill('#f1f5f9');
        }

        // 2. 텍스트 및 상세 메타 정보 영역
        const textY = imgBoxY + imgBoxH + 6;
        const textW = cardW - 12;

        // 장비명 (Title)
        doc.font('KR-Bold').fontSize(8.5).fillColor(COLOR.ink)
          .text(post.title, x + 6, textY, { width: textW, lineBreak: false, ellipsis: true });

        // 규격 정보 (Specifications)
        doc.font('KR').fontSize(7).fillColor(COLOR.sub)
          .text(`규격: ${post.specifications || '-'}`, x + 6, textY + 11, { width: textW, lineBreak: false, ellipsis: true });

        // 보유량 및 제조년도
        doc.font('KR').fontSize(6.5).fillColor(COLOR.faint)
          .text(`보유: ${post.quantity || '-'}  |  제조: ${post.mappingYear || '-'}`, x + 6, textY + 22, { width: textW, lineBreak: false, ellipsis: true });

        // 관리 등급 뱃지
        const grade = post.managementGrade || '양호';
        this.drawBadge(doc, grade, x + 6, y + cardH - 18, { 
          bg: grade.includes('최상') ? COLOR.pillBg : '#f1f5f9', 
          color: grade.includes('최상') ? COLOR.pillText : COLOR.sub, 
          fontSize: 6.5 
        });
      });
    }
  }

  // ✨ 최근 프로젝트 (이미지 잘림 방지 fit 처리 적용)
  private renderFeaturedPortfolio(doc: PDFKit.PDFDocument, posts: any[]) {
    this.drawSectionHeader(doc, '최근 프로젝트');

    const cardX = 50;
    const cardW = doc.page.width - 100;
    const availableHeight = doc.page.height - 50 - doc.y;

    if (posts.length === 0) {
      doc.font('KR').fontSize(10).fillColor(COLOR.faint)
        .text('등록된 공사실적이 없습니다.', cardX, doc.y);
      return;
    }

    const { rowH, shown, remainder } = this.fitRows(posts.length, availableHeight, 70, 96);
    const gap = 10;
    const cardH = rowH - gap;
    const thumbSize = Math.min(cardH - 24, 64);
    const compact = cardH < 84;

    let cardY = doc.y;
    posts.slice(0, shown).forEach((post) => {
      this.drawCardBg(doc, cardX, cardY, cardW, cardH);

      const thumbX = cardX + 16;
      const thumbY = cardY + (cardH - thumbSize) / 2;
      const imageFile = post.files?.find((f: any) => f.type === 'image');
      
      if (imageFile) {
        try {
          const imgPath = path.join(process.cwd(), 'uploads', path.basename(imageFile.url));
          if (fs.existsSync(imgPath)) {
            doc.save();
            doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 8).clip();
            // 이미지 잘림 방지를 위한 fit 및 중앙 정렬 옵션 추가
            doc.image(imgPath, thumbX, thumbY, { 
              width: thumbSize, 
              height: thumbSize, 
              fit: [thumbSize, thumbSize], 
              align: 'center', 
              valign: 'center' 
            });
            doc.restore();
          } else {
            doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 8).fill('#f1f5f9');
          }
        } catch (e) {
          doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 8).fill('#f1f5f9');
        }
      } else {
        doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 8).fill('#f1f5f9');
      }

      const textX = thumbX + thumbSize + 18;
      const textW = cardW - (textX - cardX) - 90;
      const titleSize = compact ? 9.5 : 11;
      const subSize = compact ? 7.5 : 8;

      doc.font('KR-Bold').fontSize(titleSize).fillColor(COLOR.ink)
        .text(post.title, textX, cardY + (compact ? 10 : 16), { width: textW, lineBreak: false, ellipsis: true });

      const dateLabel = post.workYear ? `${post.workYear}.${post.workMonth || ''}` : new Date(post.createdAt).toLocaleDateString('ko-KR');
      doc.font('KR').fontSize(subSize).fillColor(COLOR.sub)
        .text(`발주/시공사: ${post.clientName || '미지정'}    ·    ${dateLabel}`, textX, doc.y + 4, { width: textW, lineBreak: false, ellipsis: true });

      if (!compact) {
        const summary = this.stripHtml(post.content).slice(0, 60);
        if (summary) {
          doc.font('KR').fontSize(subSize).fillColor(COLOR.faint)
            .text(summary, textX, doc.y + 4, { width: textW, lineBreak: false, ellipsis: true });
        }
      }

      this.drawBadge(doc, '공사실적', cardX + cardW - 80, cardY + (cardH - 20) / 2, { bg: COLOR.pillBg, color: COLOR.pillText });

      cardY += rowH;
    });

    this.drawRemainderNote(doc, cardX, cardY - gap + 6, cardW, remainder);
  }

  private renderTimelinePortfolioPages(doc: PDFKit.PDFDocument, posts: any[]) {
    const grouped = new Map<string, any[]>();
    posts.forEach((post) => {
      const year = post.workYear ? String(post.workYear) : String(new Date(post.createdAt).getFullYear());
      if (!grouped.has(year)) grouped.set(year, []);
      grouped.get(year)!.push(post);
    });
    const years = Array.from(grouped.keys()).sort((a, b) => Number(b) - Number(a));

    let currentYearIdx = 0;

    while (currentYearIdx < years.length) {
      doc.addPage();
      this.fillPageBg(doc);
      this.drawSectionHeader(doc, '연도별 시공 실적');

      const pageLeft = 50;
      const pageRight = doc.page.width - 50;
      const usableWidth = pageRight - pageLeft;
      const colWidth = (usableWidth - 30) / 2;
      
      let cursorY = doc.y;
      const maxY = doc.page.height - 50;

      while (currentYearIdx < years.length) {
        const year = years[currentYearIdx];
        const items = grouped.get(year)!;

        const headerHeight = 28;
        const estimatedItemH = 36; 
        const totalItemsHeight = Math.ceil(items.length / 2) * estimatedItemH + headerHeight;

        if (cursorY !== doc.y && cursorY + totalItemsHeight > maxY) {
          break;
        }

        doc.font('KR-Bold').fontSize(16).fillColor(COLOR.ink).text(year, pageLeft, cursorY);
        
        const lineX = pageLeft + 48;
        const timelineTopY = cursorY + 4;
        
        cursorY += headerHeight;

        let maxRowBottomY = cursorY;

        for (let i = 0; i < items.length; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          
          const colX = pageLeft + (col === 0 ? 70 : colWidth + 30);
          const itemY = cursorY + (row * estimatedItemH);

          if (itemY + estimatedItemH > maxY) {
            break;
          }

          const post = items[i];
          const clientText = `발주/시공사: ${post.clientName || '미지정'}`;

          if (col === 0) {
            doc.circle(lineX, itemY + 6, 3.5).fill(COLOR.accent);
          }

          doc.font('KR-Bold').fontSize(9).fillColor(COLOR.ink)
            .text(post.title, colX, itemY, { width: colWidth - 20, lineBreak: true });
          
          doc.font('KR').fontSize(7.5).fillColor(COLOR.sub)
            .text(clientText, colX, doc.y + 2, { width: colWidth - 20, lineBreak: true });

          maxRowBottomY = Math.max(maxRowBottomY, doc.y + 8);
        }

        doc.moveTo(lineX, timelineTopY)
          .lineTo(lineX, maxRowBottomY - 4)
          .strokeColor('#cbd5e1')
          .lineWidth(1.5)
          .stroke();

        cursorY = maxRowBottomY + 14;
        currentYearIdx++;
      }
    }
  }
}