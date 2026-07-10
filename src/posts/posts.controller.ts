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
  Logger
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

// ✨ 해결: Public 데코레이터 추가 (파일 경로를 확인해 주세요)
import { Public } from '../auth/decorators/public.decorator'; 

const API_URL = 'https://g90179.gabia.io';

@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name); // ✨ 클래스 내부 로거 선언
  constructor(private readonly prisma: PrismaService) {}

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
      const { title, content, category } = body;
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

      return await this.prisma.post.create({
        data: { title, content, category, files: { create: dbFiles } }
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
      include: { files: true },
      orderBy: { createdAt: 'desc' }
    });
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
    const { title, content, category, deletedFileIds } = body;
    const updateData: any = { title, content, category };

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

    return this.prisma.post.update({
        where: { id: Number(id) },
        data: updateData
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const postId = Number(id);

    // 1. 삭제 전, 해당 포스트에 연결된 파일들의 URL 정보를 DB에서 미리 가져옴
    const postWithFiles = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { files: true }
    });

    if (!postWithFiles) {
      return { success: false, message: 'Post not found' };
    }

    // 2. 서버 내 실제 물리 파일 삭제 처리 (이제 fs와 path 모듈이 주입되어 에러 없이 정상 작동합니다)
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

    // 3. DB 데이터 연쇄 삭제 진행 (트랜잭션 안전 제어)
    return this.prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({ where: { postId: postId } });
      return tx.post.delete({ where: { id: postId } });
    });
  }
}