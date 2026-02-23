import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * Database health check strategy.
 * Executes a simple SELECT 1 query to verify database connectivity.
 */
export class DatabaseReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'DATABASE'
  readonly name = 'Database'
  readonly required = true

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return this.container.hasRegistration('em')
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const em = this.container.resolve<any>('em')

    // MikroORM EntityManager with Knex connection
    const connection = em.getConnection()
    const knex = connection.getKnex?.() ?? connection

    // Execute simple connectivity check
    await knex.raw('SELECT 1')

    return { ok: true }
  }
}
