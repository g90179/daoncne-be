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
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';
import type { Response } from 'express';

const API_URL = 'https://g90179.gabia.io';

@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  constructor(private readonly prisma: PrismaService) {}

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
  private resolveThumbnail(thumbnailUrl: any, content: string | undefined): { url: string; name: string; type: string } | null {
    if (thumbnailUrl) {
      let normalizedUrl = String(thumbnailUrl);
      if (normalizedUrl.includes('/uploads/')) {
        normalizedUrl = '/uploads/' + normalizedUrl.split('/uploads/')[1];
      }
      return { url: normalizedUrl, name: 'editor_thumbnail', type: 'image' };
    }

    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = content ? content.match(imgRegex) : null;
    if (match && match[1]) {
      let editorImgUrl = match[1];
      if (editorImgUrl.includes('/uploads/')) {
        editorImgUrl = '/uploads/' + editorImgUrl.split('/uploads/')[1];
      }
      return { url: editorImgUrl, name: 'editor_thumbnail', type: 'image' };
    }

    return null;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('upload', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${path.extname(file.originalname)}`);
      }
    })
  }))
  async uploadEditorImage(@UploadedFile() file: any) {
    return { url: `${API_URL}/uploads/${file.filename}` };
  }

  // 1. 게시글 생성 로직 수정
  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${path.extname(file.originalname)}`);
      }
    })
  }))
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

      const dbFiles = files?.map(f => ({
        url: `/uploads/${f.filename}`,
        name: this.fixFileNameEncoding(f.originalname),
        type: f.mimetype.startsWith('image/') ? 'image' : (f.mimetype.startsWith('video/') ? 'video' : 'file')
      })) || [];

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

    const filePath = path.join(process.cwd(), 'uploads', path.basename(file.url));

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('서버 스토리지에 실제 파일이 존재하지 않습니다.');
    }

    res.download(filePath, file.name);
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
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          cb(null, `${randomName}${path.extname(file.originalname)}`);
        }
    })
  }))
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

    const dbFiles = files?.map(f => {
      let type = 'file';
      if (f.mimetype.includes('image')) {
        type = 'image';
      } else if (f.mimetype.includes('video') || f.filename.endsWith('.mp4')) {
        type = 'video';
      }
      return {
        url: `/uploads/${f.filename}`,
        name: this.fixFileNameEncoding(f.originalname),
        type: type
      };
    }) || [];

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

    postWithFiles.files.forEach(file => {
      if (file.url.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'uploads', path.basename(file.url));

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete server file: ${filePath}`, err);
          }
        }
      }
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({ where: { postId: postId } });
      return tx.post.delete({ where: { id: postId } });
    });
  }
}