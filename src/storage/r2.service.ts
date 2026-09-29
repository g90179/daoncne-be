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

// 원본은 그대로 보존한다(다운로드/상세보기용) - 대신 목록/그리드에서만 쓰는 작은 썸네일을
// 별도 파일로 하나 더 만들어 둔다. 그리드가 3~4MB 원본을 그대로 그리는 대신 이 작은 파일을
// 쓰면 로딩이 훨씬 빨라진다. 썸네일 키는 항상 "thumb_<원본키>" 규칙을 쓴다 - DB에 명시적으로
// 저장해 둘 수도 있지만, 이 규칙만 지키면 원본 키만 알아도 썸네일 위치를 바로 계산할 수 있다.
const THUMBNAIL_PREFIX = 'thumb_';
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_QUALITY = 70;
// 키가 항상 새 무작위 문자열이라 같은 키에 다른 내용이 들어올 일이 없다 - 파일 자체에
// "1년 동안 캐싱해도 된다"는 메타데이터를 심어 둬서, 커스텀 도메인을 붙였을 때 Cloudflare
// 엣지 캐시와 브라우저 캐시가 이 힌트를 그대로 활용하게 한다.
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

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

  private randomKey(originalName: string): string {
    const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
    return `${Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('')}${ext}`;
  }

  /** 움직이는 GIF/SVG는 리사이즈해봐야 애니메이션이 깨지거나 의미가 없어 썸네일 대상에서
   * 제외한다 - 그 외 래스터 이미지만 작은 썸네일을 만든다. */
  private async makeThumbnail(buffer: Buffer, contentType?: string): Promise<Buffer | null> {
    if (!contentType?.startsWith('image/') || contentType === 'image/gif' || contentType === 'image/svg+xml') {
      return null;
    }
    try {
      const image = sharp(buffer).resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true });
      if (contentType === 'image/png') return await image.png({ quality: THUMBNAIL_QUALITY, compressionLevel: 8 }).toBuffer();
      if (contentType === 'image/webp') return await image.webp({ quality: THUMBNAIL_QUALITY }).toBuffer();
      return await image.jpeg({ quality: THUMBNAIL_QUALITY, mozjpeg: true }).toBuffer();
    } catch {
      return null; // 손상된 파일 등으로 실패하면 썸네일 없이 원본만 쓴다.
    }
  }

  /** 랜덤 키를 만들어 원본 버퍼를 그대로 업로드하고, 그 key 를 돌려준다(호출부가
   * "/uploads/<key>" 로 조립). 원본은 손대지 않는다 - 압축/리사이즈가 필요하면 uploadImage를
   * 쓴다. */
  async upload(buffer: Buffer, originalName: string, contentType?: string): Promise<{ key: string }> {
    const key = this.randomKey(originalName);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }));
    return { key };
  }

  /** 이미지 전용: 원본은 그대로 저장하고, 목록/그리드용 작은 썸네일을 "thumb_<key>"로 하나
   * 더 만들어 둔다(움직이는 GIF/SVG는 썸네일 없이 원본만). 이미 있는 upload()와 별개 메서드로
   * 둔 건, 게시글 첨부처럼 원본 그대로 필요한 파일(문서 등)에는 썸네일이 의미 없어서다. */
  async uploadImage(buffer: Buffer, originalName: string, contentType?: string): Promise<{ key: string; thumbnailKey?: string }> {
    const key = this.randomKey(originalName);
    const thumbBuffer = await this.makeThumbnail(buffer, contentType);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }));
    if (!thumbBuffer) return { key };
    const thumbnailKey = `${THUMBNAIL_PREFIX}${key}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: thumbnailKey, Body: thumbBuffer, ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }));
    return { key, thumbnailKey };
  }

  /** resolveThumbnail 처럼 원본 key/URL만 갖고 있을 때, 규칙대로 썸네일 key를 계산한다.
   * 실제로 그 썸네일이 R2에 있는지는 보장 못 한다(우리가 만든 게 아닌 이미지일 수 있음) -
   * 없으면 UploadsController가 그냥 404를 내려주고 프론트는 원본 url로 폴백한다. */
  thumbnailKeyFor(urlOrKey: string): string {
    return `${THUMBNAIL_PREFIX}${this.keyFromUrlOrKey(urlOrKey)}`;
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
