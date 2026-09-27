import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { BoatsService } from '../application/boats.service';
import { CreateBoatDto } from '../dto/create-boat.dto';
import { UpdateBoatDto } from '../dto/update-boat.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('boats')
export class BoatsController {
  constructor(private readonly boatsService: BoatsService) {}

  @Get()
  list() {
    return this.boatsService.list();
  }

  @Post()
  create(@Body() dto: CreateBoatDto, @CurrentUser() user: CurrentUserData) {
    return this.boatsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBoatDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.boatsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.boatsService.softDelete(id, user);
  }
}
