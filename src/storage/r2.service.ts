// daon-backend/src/storage/r2.service.ts
// 업로드 파일(게시글 첨부, 슬라이드 이미지, 에디터 이미지)을 R2에 저장한다. Cloudflare Containers는
// 재배포 때마다 새 컨테이너 인스턴스로 뜨는 상시 프로세스라 로컬 디스크(uploads/)에 의존하면
// 재배포 시 기존 업로드 파일이 사라진다 - R2는 컨테이너와 독립된 영속 저장소라 이 문제가 없다.
// R2는 S3 호환 API를 제공하므로 AWS SDK의 S3Client를 그대로 쓴다.
//
// File.url 은 예전과 똑같이 "/uploads/<key>" 형태(상대 경로)로 DB에 저장한다 - R2 버킷을 공개로
// 돌리는 대신, UploadsController(GET /uploads/:key)가 그 요청을 받아 R2에서 읽어 그대로
// 스트리밍해 준다. 그래서 기존에 저장돼 있던 "/uploads/xxxx.ext" 값들도(파일 자체만 R2로
// 옮겨두면) 코드/데이터 변경 없이 그대로 계속 동작한다.
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

// 원본 사진을 그대로 올리면 4~8MB짜리 파일이 그대로 서비스에 박혀서 페이지 로딩이 느려진다 -
// 화면에서 실제로 쓰는 것보다 큰 해상도는 의미가 없으므로, 업로드 시점에 한 번만 줄여둔다
// (매 요청마다 다시 압축하는 게 아니라 저장할 때 딱 한 번).
const MAX_IMAGE_WIDTH = 1920;
const JPEG_QUALITY = 78;

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET || 'daon-uploads';
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT, // https://<account id>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /** 사진이면 화면에 필요한 크기로 줄이고 압축한다 - 움직이는 GIF/SVG는 sharp로 다시
   * 인코딩하면 애니메이션이 깨지거나 의미가 없어서 원본 그대로 둔다. */
  private async optimizeIfImage(buffer: Buffer, contentType?: string): Promise<Buffer> {
    if (!contentType?.startsWith('image/') || contentType === 'image/gif' || contentType === 'image/svg+xml') {
      return buffer;
    }
    try {
      const image = sharp(buffer).resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true });
      if (contentType === 'image/png') return await image.png({ quality: JPEG_QUALITY, compressionLevel: 8 }).toBuffer();
      if (contentType === 'image/webp') return await image.webp({ quality: JPEG_QUALITY }).toBuffer();
      return await image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    } catch {
      return buffer; // 손상된 파일 등으로 처리 실패하면 원본이라도 그대로 올린다.
    }
  }

  /** 랜덤 키를 만들어 버퍼를 업로드하고, 그 key 를 돌려준다(호출부가 "/uploads/<key>" 로 조립). */
  async upload(buffer: Buffer, originalName: string, contentType?: string): Promise<{ key: string }> {
    const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
    const key = `${Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('')}${ext}`;
    const finalBuffer = await this.optimizeIfImage(buffer, contentType);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: finalBuffer, ContentType: contentType,
    }));
    return { key };
  }

  /** DB의 File.url("/uploads/xxxx.ext")이나 순수 key 어느 쪽이 와도 key만 뽑아낸다. */
  keyFromUrlOrKey(urlOrKey: string): string {
    const idx = urlOrKey.lastIndexOf('/');
    return idx >= 0 ? urlOrKey.slice(idx + 1) : urlOrKey;
  }

  /** 브로셔 PDF에 이미지로 합성할 때처럼 버퍼만 필요한 경우. */
  async getBuffer(key: string): Promise<Buffer | null> {
    const r = await this.get(key);
    return r?.buffer ?? null;
  }

  /** UploadsController 가 그대로 스트리밍할 때 - 업로드 당시 저장해 둔 Content-Type 도 함께 돌려준다. */
  async get(key: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? { buffer: Buffer.from(bytes), contentType: res.ContentType } : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => { /* 이미 없으면 무시 */ });
  }
}
