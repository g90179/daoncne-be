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
  Query
} from '@nestjs/common';

import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

const API_URL = 'https://g90179.gabia.io';

@Controller('posts')
export class PostsController {
  constructor(private readonly prisma: PrismaService) {}

  // CKEditor 5 이미지 업로드 전용 엔드포인트
  @Post('upload')
  @UseInterceptors(FileInterceptor('upload', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadEditorImage(@UploadedFile() file: any) {
    return {
      url: `${API_URL}/uploads/${file.filename}`
    };
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async create(@Body() body: any, @UploadedFiles() files: any[]) {
    const { title, content, category } = body;
    
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

    return this.prisma.post.create({
      data: {
        title,
        content,
        category,
        files: { create: dbFiles }
      }
    });
  }

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
          cb(null, `${randomName}${extname(file.originalname)}`);
        }
    })
  }))
  async update(@Param('id') id: string, @Body() body: any, @UploadedFiles() files: any[]) {
    // ⬇️ ✅ 프론트엔드에서 보낸 deletedFileIds 수신
    const { title, content, category, deletedFileIds } = body;
    const updateData: any = { title, content, category };
    
    // 1. 삭제 타겟 파일 ID 배열 파싱
    let idsToDelete: number[] = [];
    if (deletedFileIds) {
      try {
        idsToDelete = JSON.parse(deletedFileIds).map((fid: any) => Number(fid));
      } catch (e) {
        console.error('Failed to parse deletedFileIds', e);
      }
    }

    // 2. 신규 추가된 파일 리스트 파싱
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

    // 3. 에디터 본문 첫 번째 이미지 기반 자동 썸네일 재갱신
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

    // ⬇️ ✅ 4. Prisma 삭제 및 추가 쿼리 조율
    // 기존 자동 생성 썸네일 파일 혹은 사용자가 명시적으로 '✕'를 누른 파일 ID들을 동시 제거
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
    return this.prisma.post.delete({ where: { id: Number(id) } });
  }
}