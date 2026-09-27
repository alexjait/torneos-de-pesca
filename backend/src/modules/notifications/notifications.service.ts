import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type SendActivationEmailInput = {
  to: string;
  fullName: string;
  activationUrl: string;
  idempotencyKey: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.resolveFromEmail();
    this.resend =
      apiKey && !apiKey.includes('placeholder') ? new Resend(apiKey) : null;
  }

  async sendAccountActivationEmail(input: SendActivationEmailInput) {
    return this.sendTransactionalEmail({
      to: input.to,
      subject: 'Activa tu cuenta',
      html: this.renderActivationEmail({
        fullName: input.fullName,
        title: 'Activa tu cuenta',
        lead: 'Tu cuenta fue creada en Torneos Pesca.',
        actionLabel: 'Activar cuenta',
        activationUrl: input.activationUrl,
      }),
      idempotencyKey: input.idempotencyKey,
    });
  }

  async sendOfficialRegistrationEmail(input: SendActivationEmailInput) {
    return this.sendTransactionalEmail({
      to: input.to,
      subject: 'Activa tu cuenta de fiscal',
      html: this.renderActivationEmail({
        fullName: input.fullName,
        title: 'Tu acceso como fiscal ya está listo',
        lead: 'Te dimos de alta como fiscal en Torneos Pesca.',
        actionLabel: 'Activar cuenta',
        activationUrl: input.activationUrl,
      }),
      idempotencyKey: input.idempotencyKey,
    });
  }

  async sendParticipantRegistrationEmail(input: SendActivationEmailInput) {
    return this.sendAccountActivationEmail(input);
  }

  private async sendTransactionalEmail(input: {
    to: string;
    subject: string;
    html: string;
    idempotencyKey: string;
  }) {
    if (!this.resend) {
      this.logger.warn(
        `Resend no está configurado. Email no enviado a ${input.to}.`,
      );
      return { accepted: false, providerMessageId: null, errorCode: 'resend_not_configured' };
    }

    const { data, error } = await this.resend.emails.send(
      {
        from: this.fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (error) {
      this.logger.error(`Error enviando email a ${input.to}: ${error.message}`);
      return {
        accepted: false,
        providerMessageId: null,
        errorCode: error.name ?? 'resend_error',
      };
    }

    return {
      accepted: true,
      providerMessageId: data?.id ?? null,
      errorCode: null,
    };
  }

  private resolveFromEmail() {
    const emailFrom = this.configService.get<string>('EMAIL_FROM')?.trim();
    if (emailFrom) {
      return emailFrom;
    }

    const resendFromEmail = this.configService
      .get<string>('RESEND_FROM_EMAIL')
      ?.trim();
    if (resendFromEmail) {
      return resendFromEmail;
    }

    return 'Torneos Pesca <no-reply@example.com>';
  }

  private renderActivationEmail(input: {
    fullName: string;
    title: string;
    lead: string;
    actionLabel: string;
    activationUrl: string;
  }) {
    return `
      <div style="margin:0;background:#f4efe6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#16343a;">
        <div style="margin:0 auto;max-width:560px;overflow:hidden;border:1px solid #d7c8b4;border-radius:20px;background:#fffdf8;">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#16343a,#1f6a72);color:#fffdf8;">
            <div style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.78;">Torneos Pesca</div>
            <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;">${input.title}</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola ${input.fullName},</p>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${input.lead}</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Por seguridad, tenés que definir tu contraseña al activar la cuenta.</p>
            <p style="margin:0 0 24px;">
              <a href="${input.activationUrl}" style="display:inline-block;border-radius:999px;background:#1f6a72;padding:14px 24px;color:#fffdf8;font-size:15px;font-weight:700;text-decoration:none;">${input.actionLabel}</a>
            </p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4b5e61;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
            <p style="margin:0;word-break:break-word;font-size:14px;line-height:1.6;">
              <a href="${input.activationUrl}" style="color:#1f6a72;">${input.activationUrl}</a>
            </p>
          </div>
          <div style="padding:18px 32px;border-top:1px solid #ece1d2;background:#fcf8f1;color:#6a6056;font-size:13px;line-height:1.5;">
            Este mensaje fue enviado por Torneos Pesca para completar el acceso a tu cuenta.
          </div>
        </div>
      </div>
    `;
  }
}
