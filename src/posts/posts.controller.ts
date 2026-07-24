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
  Res // ✨ Res 추가
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';
import type { Response } from 'express'; // ✨ import type으로 변경

const API_URL = 'https://g90179.gabia.io';

@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  constructor(private readonly prisma: PrismaService) {}

  // ✨ [신규 헬퍼] Multer가 latin1로 잘못 해석한 originalname을 UTF-8로 복원
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
      const { title, content, category, clientName, workAddress, workLat, workLng, workYear, workMonth, keywords } = body;
      const dbFiles = files?.map(f => ({
        url: `/uploads/${f.filename}`,
        name: this.fixFileNameEncoding(f.originalname), // ✨ 인코딩 보정 적용
        type: f.mimetype.startsWith('image/') ? 'image' : (f.mimetype.startsWith('video/') ? 'video' : 'file')
      })) || [];

      const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
      const match = content ? content.match(imgRegex) : null;
      if (match && match[1]) {
        let editorImgUrl = match[1];
        if (editorImgUrl.includes('/uploads/')) editorImgUrl = '/uploads/' + editorImgUrl.split('/uploads/')[1];
        dbFiles.unshift({ url: editorImgUrl, name: 'editor_thumbnail', type: 'image' });
      }

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
          workYear: workYear ? parseInt(workYear, 10) : null,
          workMonth: workMonth ? parseInt(workMonth, 10) : null,
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
    const { title, content, category, deletedFileIds, clientName, workAddress, workLat, workLng, workYear, workMonth, keywords } = body;
    const postId = Number(id);

    const updateData: any = {
      title,
      content,
      category,
      clientName: clientName?.trim() || null,
      workAddress: workAddress?.trim() || null,
      workLat: workLat ? parseFloat(workLat) : null,
      workLng: workLng ? parseFloat(workLng) : null,
      workYear: workYear ? parseInt(workYear, 10) : null,
      workMonth: workMonth ? parseInt(workMonth, 10) : null,
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
        name: this.fixFileNameEncoding(f.originalname), // ✨ 인코딩 보정 적용
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

    return this.prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({ where: { postId: postId } });
      return tx.post.delete({ where: { id: postId } });
    });
  }

  // ✨ [신규] 원본 파일명으로 다운로드되는 전용 엔드포인트
  @Public()
  @Get('files/:fileId/download')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.prisma.file.findUnique({ where: { id: Number(fileId) } });
    if (!file) throw new NotFoundException('파일을 찾을 수 없습니다.');

    const filePath = path.join(__dirname, '..', '..', file.url);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('서버에 파일이 존재하지 않습니다.');
    }

    // res.download()이 Content-Disposition 헤더를 자동으로 파일명 인코딩까지 처리해줌
    res.download(filePath, file.name);
  }
}