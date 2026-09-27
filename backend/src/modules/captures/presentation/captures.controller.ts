import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CapturesService } from '../application/captures.service';
import { CreateCaptureDto } from '../dto/create-capture.dto';
import { ListCapturesQueryDto } from '../dto/list-captures-query.dto';
import { ResolveCaptureDto } from '../dto/resolve-capture.dto';
import { SyncCapturesDto } from '../dto/sync-captures.dto';
import { UpdateCaptureDto } from '../dto/update-capture.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('captures')
export class CapturesController {
  constructor(private readonly capturesService: CapturesService) {}

  @Get('context')
  @Roles(UserRole.OFFICIAL)
  getContext(@CurrentUser() user: CurrentUserData) {
    return this.capturesService.getOfficialContext(user);
  }

  @Get('media/:mediaId')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL)
  async getMedia(
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: CurrentUserData,
    @Res() response: Response,
  ) {
    const media = await this.capturesService.getMediaFile(mediaId, user);
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    response.sendFile(media.absolutePath);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL)
  list(@Query() query: ListCapturesQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.capturesService.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL)
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.capturesService.get(id, user);
  }

  @Post()
  @Roles(UserRole.OFFICIAL)
  create(@Body() dto: CreateCaptureDto, @CurrentUser() user: CurrentUserData) {
    return this.capturesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.OFFICIAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCaptureDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.capturesService.update(id, dto, user);
  }

  @Post('sync')
  @Roles(UserRole.OFFICIAL)
  sync(@Body() dto: SyncCapturesDto, @CurrentUser() user: CurrentUserData) {
    return this.capturesService.sync(dto, user);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL)
  approve(
    @Param('id') id: string,
    @Body() dto: ResolveCaptureDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.capturesService.approve(id, dto, user);
  }

  @Post(':id/observe')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL)
  observe(
    @Param('id') id: string,
    @Body() dto: ResolveCaptureDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.capturesService.observe(id, dto, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL)
  reject(
    @Param('id') id: string,
    @Body() dto: ResolveCaptureDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.capturesService.reject(id, dto, user);
  }
}
