// daon-backend/src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // .env에 입력된 정보로 이메일 발송 우체부(Transporter) 세팅
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 🔔 견적문의 수신용 프리미엄 HTML 메일 폼 발송 엔진
  async sendQuoteNotification(toEmail: string, quoteDetails: any) {
    const adminLink = `${process.env.FRONTEND_URL}/admin`; // 대시보드 또는 견적관리 페이지 주소

    const htmlContent = `
      <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 20px; bg: #ffffff; color: #171717;">
        <h2 style="font-size: 18px; font-weight: 300; letter-spacing: -0.5px; border-bottom: 1px solid #171717; padding-bottom: 18px; margin-top: 0; color: #171717;">
          🔔 DAON CNE <span style="font-weight: 700;">새로운 견적 문의 접수</span>
        </h2>
        <p style="font-size: 13px; color: #525252; line-height: 1.6; margin-top: 20px;">
          안녕하세요, 관리자님.<br />
          다온씨엔이 공식 웹사이트를 통해 새로운 고객 견적 문의가 실시간 접수되어 안내해 드립니다.
        </p>
        
        <div style="background-color: #f8f9fa; border-radius: 14px; padding: 24px; margin: 28px 0; border: 1px solid #f1f3f5;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="width: 110px; font-weight: 700; color: #737373; padding: 8px 0; vertical-align: top;">고객명 / 회사명</td>
              <td style="color: #171717; font-weight: 500; padding: 8px 0;">${quoteDetails.name || '미기입'}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #737373; padding: 8px 0; vertical-align: top;">연락처</td>
              <td style="color: #171717; padding: 8px 0; font-family: monospace;">${quoteDetails.phone || '미기입'}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #737373; padding: 8px 0; vertical-align: top;">이메일 주소</td>
              <td style="color: #171717; padding: 8px 0; font-family: monospace;">${quoteDetails.email || '미기입'}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #737373; padding: 12px 0 8px 0; vertical-align: top; border-top: 1px dashed #e5e7eb;">문의 상세내용</td>
              <td style="color: #262626; padding: 12px 0 8px 0; white-space: pre-wrap; line-height: 1.6; border-top: 1px dashed #e5e7eb;">${quoteDetails.content || '내용 항목이 비어있습니다.'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 32px; margin-bottom: 12px;">
          <a href="${adminLink}" target="_blank" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 13px; font-weight: bold; text-decoration: none; padding: 14px 36px; border-radius: 12px; transition: all 0.2s;">
            홈페이지 견적문의 관리자로 이동 →
          </a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #f1f3f5; margin: 40px 0 20px 0;" />
        <p style="font-size: 11px; color: #a3a3a3; text-align: center; margin: 0; letter-spacing: -0.2px;">
          본 메일은 daoncne 시스템에 의해 자동 생성된 보완 발송 전용 알림 메일입니다.
        </p>
      </div>
    `;

    // 메일 최종 발송 액션
    await this.transporter.sendMail({
      from: `"다온씨엔이 알림" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[견적문의 접수] ${quoteDetails.name || '고객'}님의 새로운 문의 내역입니다.`,
      html: htmlContent,
    });
  }
}