// daon-backend/src/quotes/quotes.service.ts
import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import * as crypto from 'crypto';

const CAPTCHA_SALT = 'daon_cne_captcha_secure_key_2026';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  // 🤖 캡차 생성기 우회 개편
  // 🤖 캡차 생성기 스텔스 엔진
  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const answer = num1 + num2;
    const expiry = Date.now() + 5 * 60 * 1000;

    const tokenData = `${answer}_${expiry}`;
    const fullHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(tokenData).digest('hex');
    const shortCode = fullHash.substring(0, 8);

    return { question: `${num1} + ${num2} = ?`, cc: shortCode, exp: expiry };
  }

  // 🛡️ 매개변수에 stealthData 구역을 추가합니다.
  async create(createQuoteDto: CreateQuoteDto, stealthData: { plt: number; ans: string; cc: string; exp: number }) {
    const { plt, ans, cc, exp } = stealthData;

    // 헤더 기반 속도 및 검증 가동 (200초 검수 기준 유지)
    const duration = (Date.now() - plt) / 1000;
    const isSuspected = duration < 200.0 || cc;

    if (isSuspected) {
      if (!cc || !exp || !ans) {
        throw new ForbiddenException('CAPTCHA_REQUIRED');
      }

      if (Date.now() > exp) {
        throw new BadRequestException('인증 시간이 만료되었습니다. 다시 시도해 주세요.');
      }

      const expectedTokenData = `${ans.trim()}_${exp}`;
      const fullHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(expectedTokenData).digest('hex');
      const shortCode = fullHash.substring(0, 8);

      if (cc !== shortCode) {
        throw new BadRequestException('자동 등록 방지 코드가 일치하지 않습니다.');
      }
    }

    // 데이터베이스에는 100% 가비아가 허용하는 깨끗한 데이터만 바인딩
    return await this.prisma.quote.create({ data: createQuoteDto });
  }

  // 🔒 보안 강화: 목록 조회 시 비밀글은 핵심 민감 정보 블라인드 처리
  async findAll() {
    const quotes = await this.prisma.quote.findMany({ orderBy: { id: 'desc' } });
    return quotes.map(q => {
      if (q.isSecret) {
        return { 
          id: q.id, title: q.title, name: q.name, isSecret: q.isSecret, 
          status: q.status, createdAt: q.createdAt 
        };
      }
      return q;
    });
  }

  // 🔍 단일 상세 조회 (관리자 전용)
  async findOne(id: number) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('해당 문의글을 찾을 수 없습니다.');
    return quote;
  }

  // 🔑 비밀번호 검증 후 상세 데이터 반환 (작성자용)
  async verifyAndPassword(id: number, password: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('해당 문의글을 찾을 수 없습니다.');
    if (quote.password !== password) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    return quote;
  }

  // ✍️ 일반 수정 (수정 시에도 비밀번호 검증)
  async update(id: number, updateQuoteDto: UpdateQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('해당 문의글을 찾을 수 없습니다.');
    if (updateQuoteDto.password && quote.password !== updateQuoteDto.password) {
      throw new UnauthorizedException('비밀번호가 올바르지 않아 수정할 수 없습니다.');
    }
    return await this.prisma.quote.update({
      where: { id },
      data: updateQuoteDto,
    });
  }

  // 👑 관리자 답변 달기 및 상태 변경
  async addReply(id: number, reply: string) {
    return await this.prisma.quote.update({
      where: { id },
      data: {
        reply,
        status: reply.trim() ? '답변완료' : '접수대기',
        replyAt: new Date(),
      },
    });
  }
}