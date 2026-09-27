import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { PublicAuthRateLimitGuard } from '../../../common/auth/public-auth-rate-limit.guard';
import { AuthService } from '../application/auth.service';
import { ActivateAccountDto } from '../dto/activate-account.dto';
import { BootstrapAdminDto } from '../dto/bootstrap-admin.dto';
import { CompletePasswordSetupDto } from '../dto/complete-password-setup.dto';
import { LoginDto } from '../dto/login.dto';
import { RequestPasswordSetupDto } from '../dto/request-password-setup.dto';

@UseGuards(PublicAuthRateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap-admin')
  bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    return this.authService.bootstrapAdmin(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(dto, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.logout(request, response);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.refresh(request, response);
  }

  @Post('activate-account')
  activateAccount(@Body() dto: ActivateAccountDto) {
    return this.authService.activateAccount(dto);
  }

  @Post('request-password-setup')
  requestPasswordSetup(@Body() dto: RequestPasswordSetupDto) {
    return this.authService.requestPasswordSetup(dto);
  }

  @Post('complete-password-setup')
  completePasswordSetup(@Body() dto: CompletePasswordSetupDto) {
    return this.authService.completePasswordSetup(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserData) {
    return this.authService.me(user.sub);
  }
}
