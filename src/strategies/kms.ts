import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * KMS (Vault) health check strategy.
 * Verifies encryption key management service connectivity.
 */
export class KmsReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'KMS'
  readonly name = 'KMS (Vault)'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    const encryptionEnabled = process.env.TENANT_DATA_ENCRYPTION_ENABLED === 'true'
    const vaultConfigured = Boolean(
      process.env.VAULT_ADDR && process.env.VAULT_TOKEN
    )
    return encryptionEnabled && vaultConfigured
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.container.hasRegistration('kmsService')) {
      return { ok: false, message: 'KMS service not registered' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kmsService = this.container.resolve<any>('kmsService')

    const isHealthy = await kmsService.isHealthy?.()

    if (isHealthy === false) {
      return { ok: false, message: 'KMS/Vault not healthy' }
    }

    return { ok: true }
  }
}
