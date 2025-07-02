import nodemailer from 'nodemailer';
import axios from 'axios';

interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
    recipients: string[];
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
  teams?: {
    enabled: boolean;
    webhookUrl: string;
  };
}

interface DeploymentNotification {
  environment: string;
  status: 'success' | 'failure' | 'started';
  branch: string;
  commit: string;
  qualityScore: number;
  buildDuration?: number;
  deploymentUrl?: string;
  errorMessage?: string;
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async sendDeploymentNotification(data: DeploymentNotification): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.email?.enabled) {
      promises.push(this.sendEmailNotification(data));
    }

    if (this.config.slack?.enabled) {
      promises.push(this.sendSlackNotification(data));
    }

    if (this.config.teams?.enabled) {
      promises.push(this.sendTeamsNotification(data));
    }

    await Promise.allSettled(promises);
  }

  private async sendEmailNotification(data: DeploymentNotification): Promise<void> {
    if (!this.config.email) return;

    const transporter = nodemailer.createTransporter({
      host: this.config.email.smtp.host,
      port: this.config.email.smtp.port,
      secure: this.config.email.smtp.port === 465,
      auth: {
        user: this.config.email.smtp.user,
        pass: this.config.email.smtp.pass,
      },
    });

    const subject = `🚀 Deploy ${data.status.toUpperCase()} - ${data.environment}`;
    const statusEmoji = data.status === 'success' ? '✅' : data.status === 'failure' ? '❌' : '🚀';
    const statusColor = data.status === 'success' ? '#28a745' : data.status === 'failure' ? '#dc3545' : '#007bff';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1>${statusEmoji} Deploy ${data.status.toUpperCase()}</h1>
        </div>
        
        <div style="padding: 20px; background: #f8f9fa;">
          <h2>📊 Detalhes do Deploy</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td><strong>Ambiente:</strong></td><td>${data.environment}</td></tr>
            <tr><td><strong>Branch:</strong></td><td>${data.branch}</td></tr>
            <tr><td><strong>Commit:</strong></td><td>${data.commit}</td></tr>
            <tr><td><strong>Quality Score:</strong></td><td>${data.qualityScore}%</td></tr>
            ${data.buildDuration ? `<tr><td><strong>Duração do Build:</strong></td><td>${data.buildDuration}s</td></tr>` : ''}
            ${data.deploymentUrl ? `<tr><td><strong>URL:</strong></td><td><a href="${data.deploymentUrl}">${data.deploymentUrl}</a></td></tr>` : ''}
          </table>
          
          ${data.errorMessage ? `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin-top: 15px; border-radius: 5px;">
              <strong>❌ Erro:</strong><br>
              <code>${data.errorMessage}</code>
            </div>
          ` : ''}
        </div>
        
        <div style="padding: 15px; text-align: center; color: #666; font-size: 12px;">
          WebServices CI/CD Pipeline - Gerado automaticamente
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: this.config.email.smtp.user,
      to: this.config.email.recipients.join(','),
      subject,
      html,
    });
  }

  private async sendSlackNotification(data: DeploymentNotification): Promise<void> {
    if (!this.config.slack) return;

    const statusColor = data.status === 'success' ? 'good' : data.status === 'failure' ? 'danger' : '#007bff';
    const statusEmoji = data.status === 'success' ? '✅' : data.status === 'failure' ? '❌' : '🚀';

    const payload = {
      channel: this.config.slack.channel,
      attachments: [
        {
          color: statusColor,
          title: `${statusEmoji} Deploy ${data.status.toUpperCase()} - ${data.environment}`,
          fields: [
            {
              title: 'Ambiente',
              value: data.environment,
              short: true,
            },
            {
              title: 'Branch',
              value: data.branch,
              short: true,
            },
            {
              title: 'Commit',
              value: data.commit,
              short: true,
            },
            {
              title: 'Quality Score',
              value: `${data.qualityScore}%`,
              short: true,
            },
          ],
          footer: 'WebServices CI/CD',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    if (data.errorMessage) {
      payload.attachments[0].fields.push({
        title: 'Error',
        value: `\`\`\`${data.errorMessage}\`\`\``,
        short: false,
      });
    }

    await axios.post(this.config.slack.webhookUrl, payload);
  }

  private async sendTeamsNotification(data: DeploymentNotification): Promise<void> {
    if (!this.config.teams) return;

    const statusColor = data.status === 'success' ? '28a745' : data.status === 'failure' ? 'dc3545' : '007bff';
    const statusEmoji = data.status === 'success' ? '✅' : data.status === 'failure' ? '❌' : '🚀';

    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Deploy ${data.status.toUpperCase()} - ${data.environment}`,
      themeColor: statusColor,
      sections: [
        {
          activityTitle: `${statusEmoji} Deploy ${data.status.toUpperCase()}`,
          activitySubtitle: `Environment: ${data.environment}`,
          facts: [
            {
              name: 'Branch:',
              value: data.branch,
            },
            {
              name: 'Commit:',
              value: data.commit,
            },
            {
              name: 'Quality Score:',
              value: `${data.qualityScore}%`,
            },
          ],
        },
      ],
    };

    if (data.errorMessage) {
      payload.sections.push({
        activityTitle: '❌ Error Details',
        activitySubtitle: data.errorMessage,
        facts: [],
      });
    }

    await axios.post(this.config.teams.webhookUrl, payload);
  }
}

// Configuração padrão das notificações
export const defaultNotificationConfig: NotificationConfig = {
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    recipients: (process.env.EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
  },
  slack: {
    enabled: process.env.SLACK_NOTIFICATIONS === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_CHANNEL || '#deployments',
  },
  teams: {
    enabled: process.env.TEAMS_NOTIFICATIONS === 'true',
    webhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
  },
};

// Instância global do serviço de notificações
export const notificationService = new NotificationService(defaultNotificationConfig);