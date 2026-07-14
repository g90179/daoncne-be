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
  NotFoundException
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator'; 

const API_URL = 'https://g90179.gabia.io';

@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  constructor(private readonly prisma: PrismaService) {}

  // ✨ [신규 헬퍼] FormData로 넘어온 키워드 JSON 문자열을 파싱해서 정제된 배열로 반환
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

  // ✨ [신규 헬퍼] 키워드 이름 배열 → Prisma nested connectOrCreate 구문
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

  // CKEditor 5 이미지 업로드 전용 엔드포인트
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
    this.logger.log(`[게시물 생성] 요청 접수: ${body.title}`);
    try {
      const { title, content, category, clientName, workAddress, workLat, workLng, keywords } = body;
      const dbFiles = files?.map(f => ({
        url: `/uploads/${f.filename}`,
        name: f.originalname,
        type: f.mimetype.startsWith('image/') ? 'image' : (f.mimetype.startsWith('video/') ? 'video' : 'file')
      })) || [];

      // 에디터 썸네일 추출 로직...
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
      const match = content ? content.match(imgRegex) : null;
      if (match && match[1]) {
        let editorImgUrl = match[1];
        if (editorImgUrl.includes('/uploads/')) editorImgUrl = '/uploads/' + editorImgUrl.split('/uploads/')[1];
        dbFiles.unshift({ url: editorImgUrl, name: 'editor_thumbnail', type: 'image' });
      }

      // ✨ 키워드 파싱 및 연결 페이로드 구성
      const keywordNames = this.parseKeywords(keywords);

      return await this.prisma.post.create({
        data: {
          title,
          content,
          category,
          clientName: clientName?.trim() || null,
          workAddress: workAddress?.trim() || null,
          workLat: workLat ? parseFloat(workLat) : null,
          workLng: workLng ? parseFloat(workLng) : null,
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
      include: { files: true, keywords: { include: { keyword: true } } }, // ✨ 키워드 포함
      orderBy: { createdAt: 'desc' }
    });
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: Number(id) },
      include: { files: true, keywords: { include: { keyword: true } } }, // ✨ 키워드 포함
    });
    
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    return post;
  }

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
    const { title, content, category, deletedFileIds, clientName, workAddress, workLat, workLng, keywords } = body;
    const postId = Number(id);

    const updateData: any = {
      title,
      content,
      category,
      clientName: clientName?.trim() || null,
      workAddress: workAddress?.trim() || null,
      workLat: workLat ? parseFloat(workLat) : null,
      workLng: workLng ? parseFloat(workLng) : null,
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
        name: f.originalname,
        type: type
      };
    }) || [];

    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = content ? content.match(imgRegex) : null;

    if (match && match[1]) {
      let editorImgUrl = match[1];
      if (editorImgUrl.includes('/uploads/')) {
        editorImgUrl = '/uploads/' + editorImgUrl.split('/uploads/')[1];
      }
      dbFiles.unshift({
        url: editorImgUrl,
        name: 'editor_thumbnail',
        type: 'image'
      });
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

    // ✨ 키워드 갱신: 기존 연결 전부 해제 후 새로 연결 (파일 처리와 동일한 패턴)
    const keywordNames = this.parseKeywords(keywords);
    updateData.keywords = {
      deleteMany: {}, // 이 포스트에 연결된 PostKeyword 전부 삭제 (Keyword 마스터 자체는 유지됨)
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
        const filePath = path.join(__dirname, '..', '..', file.url);

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete server file: ${filePath}`, err);
          }
        }
      }
    });

    // ✨ keywords(PostKeyword)는 Prisma 스키마에 onDelete: Cascade로 걸려 있어서
    //    post.delete() 시 자동으로 함께 정리됩니다. Keyword 마스터 자체는 남습니다.
    return this.prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({ where: { postId: postId } });
      return tx.post.delete({ where: { id: postId } });
    });
  }
}