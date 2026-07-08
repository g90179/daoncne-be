// daon-backend/src/policies/policies.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { Prisma } from '@prisma/client';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  create(@Body() data: Prisma.PolicyCreateInput) {
    return this.policiesService.create(data);
  }

  @Get()
  findAll(@Query('type') type?: string) {
    return this.policiesService.findAll(type);
  }

  @Get('exposed/:type')
  findExposed(@Param('type') type: string) {
    return this.policiesService.findExposed(type);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.PolicyUpdateInput) {
    return this.policiesService.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.policiesService.remove(+id);
  }
}