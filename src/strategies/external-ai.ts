import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * External AI providers health check strategy.
 * Verifies AI service provider configuration (OpenAI, Anthropic, etc.)
 */
export class ExternalAiProvidersReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'EXTERNAL_AI_PROVIDERS'
  readonly name = 'AI Providers'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.AZURE_OPENAI_API_KEY
    )
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    // Check if AI service is registered
    const serviceNames = ['aiService', 'openaiService', 'anthropicService']
    let service = null

    for (const name of serviceNames) {
      if (this.container.hasRegistration(name)) {
        service = this.container.resolve(name)
        break
      }
    }

    if (!service) {
      // No service registered but API keys are configured - consider it ok
      // as the provider will be initialized on first use
      return { ok: true, message: 'API keys configured, service lazy-loaded' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiService = service as any

    // Check if service has a health check method
    if (typeof aiService.isHealthy === 'function') {
      const isHealthy = await aiService.isHealthy()
      if (!isHealthy) {
        return { ok: false, message: 'AI provider not healthy' }
      }
    }

    return { ok: true }
  }
}
