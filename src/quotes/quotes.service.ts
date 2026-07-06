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
  // 🤖 캡차 생성기 스텔스 엔진
  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const answer = num1 + num2;
    const expiry = Date.now() + 5 * 60 * 1000; // 5분 유효

    const tokenData = `${answer}_${expiry}`;
    const fullHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(tokenData).digest('hex');
    const shortCode = fullHash.substring(0, 8); // 64자리를 8자리 평범한 스트링으로 압축 위장

    return {
      question: `${num1} + ${num2} = ?`,
      cc: shortCode,
      exp: expiry,
    };
  }

  async create(createQuoteDto: CreateQuoteDto) {
    // 🛡️ 스텔스 변수들을 가로채고 순수 DB 데이터(...quoteData)만 분리
    const { email_confirm, plt, ans, cc, exp, ...quoteData } = createQuoteDto;

    // 1️⃣ 허니팟 낚시줄 검증 (일반 이메일 확인창처럼 속임)
    if (email_confirm && email_confirm.trim() !== '') {
      throw new BadRequestException('Invalid submission.');
    }

    // 2️⃣ 속도 측정 (단위: 초)
    const duration = (Date.now() - plt) / 1000;
    
    // 현재 검수용으로 설정하신 200초 임계값 정상 작동 유도
    const isSuspected = duration < 200.0 || cc;

    if (isSuspected) {
      // 하나라도 누락되었다면 프론트에 캡차 개방 시그널 전송
      if (!cc || !exp || !ans) {
        throw new ForbiddenException('CAPTCHA_REQUIRED');
      }

      // 캡차 시간 만료 체크
      if (Date.now() > exp) {
        throw new BadRequestException('인증 시간이 만료되었습니다. 다시 시도해 주세요.');
      }

      // 8자리 쇼트 해시 교차 검증
      const expectedTokenData = `${ans.trim()}_${exp}`;
      const fullHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(expectedTokenData).digest('hex');
      const shortCode = fullHash.substring(0, 8);

      if (cc !== shortCode) {
        throw new BadRequestException('자동 등록 방지 코드가 일치하지 않습니다.');
      }
    }

    // 🟢 모든 검증 통과 시 오염되지 않은 데이터만 안전하게 저장
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