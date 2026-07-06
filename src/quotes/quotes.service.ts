// src/quotes/quotes.service.ts
import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import * as crypto from 'crypto';

const CAPTCHA_SALT = 'daon_cne_captcha_secure_key_2026';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  // 🤖 캡차 생성기 우회 개편
  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const answer = num1 + num2;
    const expiry = Date.now() + 5 * 60 * 1000; // 5분 유효

    const tokenData = `${answer}_${expiry}`;
    const captchaHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(tokenData).digest('hex');

    // 특수문자가 섞인 통짜 토큰 대신 구조화된 데이터로 리턴
    return {
      question: `${num1} + ${num2} = ?`,
      captchaHash,     // 0-9, a-f로만 구성된 안전한 문자열
      captchaExpiry: expiry, // 순수 숫자
    };
  }

  async create(createQuoteDto: CreateQuoteDto) {
    const { honeyPot, pageLoadedAt, captchaAnswer, captchaHash, captchaExpiry, ...quoteData } = createQuoteDto;

    if (honeyPot && honeyPot.trim() !== '') {
      throw new BadRequestException('비정상적인 접근입니다. (Robot Detected)');
    }

    const duration = (Date.now() - pageLoadedAt) / 1000;

    // 🔬 검수용 200초 조건 또는 캡차 해시가 넘어왔을 때 의심 모드 가동
    const isSuspected = duration < 200.0 || captchaHash;

    if (isSuspected) {
      // 3개 필드 중 하나라도 누락되었다면 필수 요구 응답 반환
      if (!captchaHash || !captchaExpiry || !captchaAnswer) {
        throw new ForbiddenException('CAPTCHA_REQUIRED');
      }

      // 시간 만료 검증
      if (Date.now() > captchaExpiry) {
        throw new BadRequestException('인증 시간이 만료되었습니다. 다시 시도해 주세요.');
      }

      // 정답 재해싱 검증
      const expectedTokenData = `${captchaAnswer.trim()}_${captchaExpiry}`;
      const expectedHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(expectedTokenData).digest('hex');

      if (captchaHash !== expectedHash) {
        throw new BadRequestException('자동 등록 방지 코드가 일치하지 않습니다.');
      }
    }

    return await this.prisma.quote.create({ data: quoteData });
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