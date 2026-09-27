import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { OfficialsService } from '../application/officials.service';
import { AssignOfficialDto } from '../dto/assign-official.dto';
import { CreateOfficialDto } from '../dto/create-official.dto';
import { UpdateOfficialDto } from '../dto/update-official.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('officials')
export class OfficialsController {
  constructor(private readonly officialsService: OfficialsService) {}

  @Get()
  list() {
    return this.officialsService.list();
  }

  @Post()
  create(@Body() dto: CreateOfficialDto, @CurrentUser() user: CurrentUserData) {
    return this.officialsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOfficialDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.officialsService.update(id, dto, user);
  }

  @Post(':id/assignments')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignOfficialDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.officialsService.assignToTournament(id, dto, user);
  }

  @Delete(':id/assignments/:assignmentId')
  removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.officialsService.removeAssignment(id, assignmentId, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.officialsService.softDelete(id, user);
  }
}
