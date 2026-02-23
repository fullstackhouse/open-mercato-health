import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * Email delivery health check strategy.
 * Verifies email service provider configuration and connectivity.
 */
export class EmailDeliveryReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'EMAIL_DELIVERY'
  readonly name = 'Email Delivery'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST ||
        process.env.SENDGRID_API_KEY ||
        process.env.POSTMARK_API_TOKEN ||
        process.env.RESEND_API_KEY
    )
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.container.hasRegistration('emailService')) {
      return { ok: false, message: 'Email service not registered' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailService = this.container.resolve<any>('emailService')

    // Check if service has a health/verify method
    if (typeof emailService.isConfigured === 'function') {
      const isConfigured = await emailService.isConfigured()
      if (!isConfigured) {
        return { ok: false, message: 'Email service not configured' }
      }
    }

    if (typeof emailService.verify === 'function') {
      const verified = await emailService.verify()
      if (!verified) {
        return { ok: false, message: 'Email service verification failed' }
      }
    }

    return { ok: true }
  }
}
