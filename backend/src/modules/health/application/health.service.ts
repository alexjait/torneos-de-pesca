import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, mkdir } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join, resolve } from 'path';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class HealthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const root = this.resolveStorageRoot();
    await mkdir(root, { recursive: true });
    await access(root, fsConstants.R_OK | fsConstants.W_OK);
  }

  getLiveStatus() {
    return {
      data: {
        status: 'live',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getReadyStatus() {
    try {
      await this.checkDatabase();
      await this.checkStorage();
    } catch (error) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          module: 'health',
          event: 'GET /api/v1/health/ready',
          message: 'Readiness check failed',
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      throw new ServiceUnavailableException('Servicio no listo');
    }

    return {
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async checkDatabase() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkStorage() {
    const root = this.resolveStorageRoot();
    await access(root, fsConstants.R_OK | fsConstants.W_OK);
  }

  private resolveStorageRoot() {
    const configured = this.configService.get<string>('MEDIA_STORAGE_DIR');
    return resolve(configured || join(process.cwd(), 'uploads'));
  }
}
