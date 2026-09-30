// daon-backend/src/posts/posts.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Query,
  Logger,
  NotFoundException,
  Res
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { memoryStorage } from 'multer';
import { R2Service } from '../storage/r2.service';
import { Public } from '../auth/decorators/public.decorator';
import type { Response } from 'express';

// 에디터가 본문 HTML에 직접 박아 넣는 <img> 경로라 프론트 origin 기준 상대경로로 두면 안 되고,
// 백엔드 자신의 공개 주소를 절대경로로 써야 한다. 폴백 기본값은 반드시 이 백엔드(DAON) 자신의
// 주소여야 한다 - 예전엔 G90179 주소가 잘못 하드코딩돼 있어서, API_PUBLIC_URL 시크릿이 아직
// 등록되기 전에 작성된 게시글 본문에 죽은 링크가 그대로 박히는 사고가 있었다.
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || 'https://daoncne-be.gusqlslee.workers.dev').replace(/\/+$/, '');

@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  private fixFileNameEncoding(originalname: string): string {
    try {
      return Buffer.from(originalname, 'latin1').toString('utf8');
    } catch (e) {
      return originalname;
    }
  }

  private parseKeywords(raw: any): string[] {
    if (!raw) return [];
    try {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(arr)) return [];
      return [...new Set(
        arr
          .map((k: string) => String(k).trim())
          .filter((k: string) => k.length > 0)
      )];
    } catch (e) {
      console.error('Failed to parse keywords', e);
      return [];
    }
  }

  private buildKeywordsCreatePayload(keywordNames: string[]) {
    return keywordNames.map((name) => ({
      keyword: {
        connectOrCreate: {
          where: { name },
          create: { name },
        },
      },
    }));
  }

  // ✨ [신규 헬퍼] thumbnailUrl 우선, 없으면 본문 첫 <img> 정규식 fallback
  // 이 이미지는 uploadEditorImage로 올라간 것이라 "thumb_<key>" 규칙의 썸네일이 R2에 이미
  // 만들어져 있다 - 원본 대신 그 썸네일 주소를 그리드용으로 같이 넣어준다.
  private resolveThumbnail(thumbnailUrl: any, content: string | undefined): { url: string; name: string; type: string; thumbnailUrl: string | null } | null {
    const buildEntry = (rawUrl: string) => {
      let normalizedUrl = rawUrl;
      if (normalizedUrl.includes('/uploads/')) {
        normalizedUrl = '/uploads/' + normalizedUrl.split('/uploads/')[1];
      }
      return {
        url: normalizedUrl,
        name: 'editor_thumbnail',
        type: 'image',
        thumbnailUrl: `/uploads/${this.r2.thumbnailKeyFor(normalizedUrl)}`,
      };
    };

    if (thumbnailUrl) return buildEntry(String(thumbnailUrl));

    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = content ? content.match(imgRegex) : null;
    if (match && match[1]) return buildEntry(match[1]);

    return null;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('upload', { storage: memoryStorage() }))
  async uploadEditorImage(@UploadedFile() file: Express.Multer.File) {
    // 본문에 박히는 이미지라 원본 그대로 올리되(화질 유지), 나중에 이 이미지가 게시글
    // 대표 썸네일로 쓰일 수도 있어서 목록용 작은 썸네일도 같이 만들어 둔다.
    const { key } = await this.r2.uploadImage(file.buffer, file.originalname, file.mimetype);
    // R2 커스텀 도메인이 있으면 백엔드 컨테이너를 거치는 리다이렉트 없이 곧장 그 주소를 쓴다
    // (없을 때만 예전처럼 API_PUBLIC_URL 경유 상대경로로 폴백).
    const publicUrl = this.r2.publicUrl(key);
    return { url: publicUrl.startsWith('http') ? publicUrl : `${API_PUBLIC_URL}${publicUrl}` };
  }

  // 1. 게시글 생성 로직 수정
  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async create(@Body() body: any, @UploadedFiles() files: Array<Express.Multer.File>) {
    this.logger.log(`[게시물 생성] 요청 접수: ${body.title} (카테고리: ${body.category})`);
    try {
      // 🔑 프론트엔드에서 보낸 새 필드들을 구조분해 할당으로 추출합니다.
      const {
        title, content, category,
        // 공사실적 필드
        clientName, workAddress, workLat, workLng, workYear, workMonth, keywords,
        // 🚜 보유장비 새 필드 추가
        specifications, quantity, mappingYear, managementGrade,
        thumbnailUrl
      } = body;

      const dbFiles = await Promise.all((files ?? []).map(async (f) => {
        const isImage = f.mimetype.startsWith('image/');
        const uploaded: { key: string; thumbnailKey?: string } = isImage
          ? await this.r2.uploadImage(f.buffer, f.originalname, f.mimetype)
          : await this.r2.upload(f.buffer, f.originalname, f.mimetype);
        const { key, thumbnailKey } = uploaded;
        return {
          url: `/uploads/${key}`,
          name: this.fixFileNameEncoding(f.originalname),
          type: isImage ? 'image' : (f.mimetype.startsWith('video/') ? 'video' : 'file'),
          thumbnailUrl: thumbnailKey ? `/uploads/${thumbnailKey}` : null,
        };
      }));

      const thumbnail = this.resolveThumbnail(thumbnailUrl, content);
      if (thumbnail) {
        dbFiles.unshift(thumbnail);
      }

      const keywordNames = this.parseKeywords(keywords);

      // 🔑 Prisma create data 객체에 새 필드들을 할당합니다. 무의미한 공백은 제거(trim)합니다.
      return await this.prisma.post.create({
        data: {
          title,
          content,
          category,
          // 공사실적 데이터
          clientName: clientName?.trim() || null,
          workAddress: workAddress?.trim() || null,
          workLat: workLat ? parseFloat(workLat) : null,
          workLng: workLng ? parseFloat(workLng) : null,
          workYear: workYear ? parseInt(workYear, 10) : null,
          workMonth: workMonth ? parseInt(workMonth, 10) : null,
          
          // 🚜 보유장비 데이터 추가
          specifications: specifications?.trim() || null,
          quantity: quantity?.trim() || null,
          mappingYear: mappingYear?.trim() || null, // String 그대로 저장
          managementGrade: managementGrade?.trim() || null,

          files: { create: dbFiles },
          keywords: { create: this.buildKeywordsCreatePayload(keywordNames) },
        },
        include: { files: true, keywords: { include: { keyword: true } } },
      });
    } catch (error) {
      this.logger.error(`[게시물 생성] 실패: ${error.message}`);
      throw error;
    }
  }

  @Public()
  @Get()
  async findAll(@Query('category') category: string) {
    return this.prisma.post.findMany({
      where: category ? { category } : {},
      include: { files: true, keywords: { include: { keyword: true } } },
      orderBy: { id: 'desc' }
    });
  }

  // 🚀 다운로드 라우터는 ':id'보다 반드시 위에 있어야 함
  @Public()
  @Get('files/:fileId/download')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.prisma.file.findUnique({ where: { id: Number(fileId) } });
    if (!file) throw new NotFoundException('DB에 파일 정보가 없습니다.');

    const stored = await this.r2.get(this.r2.keyFromUrlOrKey(file.url));
    if (!stored) throw new NotFoundException('서버 스토리지에 실제 파일이 존재하지 않습니다.');

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    if (stored.contentType) res.setHeader('Content-Type', stored.contentType);
    res.send(stored.buffer);
  }

  // ⚠️ 와일드카드격인 ':id'는 특수 라우터(files/...)보다 아래에 있어야 함
  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: Number(id) },
      include: { files: true, keywords: { include: { keyword: true } } },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    return post;
  }

  // 2. 게시글 수정 로직 수정
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async update(@Param('id') id: string, @Body() body: any, @UploadedFiles() files: Array<Express.Multer.File>) {
    // 🔑 수정 요청 body에서도 새 필드들을 추출합니다.
    const {
      title, content, category, deletedFileIds,
      // 공사실적 필드
      clientName, workAddress, workLat, workLng, workYear, workMonth, keywords,
      // 🚜 보유장비 새 필드 추가
      specifications, quantity, mappingYear, managementGrade,
      thumbnailUrl
    } = body;
    const postId = Number(id);

    // 🔑 업데이트할 데이터 객체에 새 필드들을 포함시킵니다.
    const updateData: any = {
      title,
      content,
      category,
      // 공사실적 데이터 업데이트
      clientName: clientName?.trim() || null,
      workAddress: workAddress?.trim() || null,
      workLat: workLat ? parseFloat(workLat) : null,
      workLng: workLng ? parseFloat(workLng) : null,
      workYear: workYear ? parseInt(workYear, 10) : null,
      workMonth: workMonth ? parseInt(workMonth, 10) : null,

      // 🚜 보유장비 데이터 업데이트 추가
      specifications: specifications?.trim() || null,
      quantity: quantity?.trim() || null,
      mappingYear: mappingYear?.trim() || null,
      managementGrade: managementGrade?.trim() || null,
    };

    let idsToDelete: number[] = [];
    if (deletedFileIds) {
      try {
        idsToDelete = JSON.parse(deletedFileIds).map((fid: any) => Number(fid));
      } catch (e) {
        console.error('Failed to parse deletedFileIds', e);
      }
    }

    const dbFiles = await Promise.all((files ?? []).map(async (f) => {
      let type = 'file';
      if (f.mimetype.includes('image')) {
        type = 'image';
      } else if (f.mimetype.includes('video') || f.originalname.endsWith('.mp4')) {
        type = 'video';
      }
      const uploaded: { key: string; thumbnailKey?: string } = type === 'image'
        ? await this.r2.uploadImage(f.buffer, f.originalname, f.mimetype)
        : await this.r2.upload(f.buffer, f.originalname, f.mimetype);
      const { key, thumbnailKey } = uploaded;
      return {
        url: `/uploads/${key}`,
        name: this.fixFileNameEncoding(f.originalname),
        type: type,
        thumbnailUrl: thumbnailKey ? `/uploads/${thumbnailKey}` : null,
      };
    }));

    // ✨ 썸네일 결정: thumbnailUrl 우선, 없으면 본문에서 추출 (중복 없이 한 번만)
    const thumbnail = this.resolveThumbnail(thumbnailUrl, content);
    if (thumbnail) {
      dbFiles.unshift(thumbnail);
    }

    const deleteConditions: any[] = [{ name: 'editor_thumbnail' }];
    if (idsToDelete.length > 0) {
      deleteConditions.push({ id: { in: idsToDelete } });
    }

    updateData.files = {
      deleteMany: {
        OR: deleteConditions
      },
      create: dbFiles
    };

    const keywordNames = this.parseKeywords(keywords);
    updateData.keywords = {
      deleteMany: {},
      create: this.buildKeywordsCreatePayload(keywordNames),
    };

    return this.prisma.post.update({
        where: { id: postId },
        data: updateData,
        include: { files: true, keywords: { include: { keyword: true } } },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const postId = Number(id);

    const postWithFiles = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { files: true }
    });

    if (!postWithFiles) {
      return { success: false, message: 'Post not found' };
    }

    await Promise.all(postWithFiles.files.map(async (file) => {
      if (!file.url.startsWith('/uploads/')) return;
      await this.r2.delete(this.r2.keyFromUrlOrKey(file.url)).catch((err) => {
        console.error(`Failed to delete R2 file: ${file.url}`, err);
      });
      // 썸네일이 있으면(우리가 만든 것이면) 같이 지운다 - 없어도 delete는 조용히 무시된다.
      await this.r2.delete(this.r2.thumbnailKeyFor(file.url)).catch(() => {});
    }));

    return this.prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({ where: { postId: postId } });
      return tx.post.delete({ where: { id: postId } });
    });
  }
}