// daon-backend/src/home/home.module.ts
import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { MainSlidesModule } from '../main-slides/main-slides.module';
import { CompanyModule } from '../company/company.module';
import { MapPositionsModule } from '../map-positions/map-positions.module';

@Module({
  imports: [MainSlidesModule, CompanyModule, MapPositionsModule],
  controllers: [HomeController],
})
export class HomeModule {}
