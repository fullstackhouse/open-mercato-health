import type { CheckKey, CheckEnableMode } from './types'

const ENV_PREFIX = 'HEALTH_READY_CHECK_'

/**
 * Resolve check enable mode from environment variable
 * HEALTH_READY_CHECK_<KEY>_ENABLED = true | false | auto
 */
export function getCheckEnableMode(key: CheckKey): CheckEnableMode {
  const envVar = `${ENV_PREFIX}${key}_ENABLED`
  const value = (process.env[envVar] ?? 'auto').toLowerCase().trim()

  if (value === 'true' || value === '1' || value === 'yes') return 'true'
  if (value === 'false' || value === '0' || value === 'no') return 'false'
  return 'auto'
}

/**
 * Determine if a check should run based on mode and configuration
 */
export function shouldRunCheck(key: CheckKey, isConfigured: boolean): boolean {
  const mode = getCheckEnableMode(key)

  switch (mode) {
    case 'true':
      return true
    case 'false':
      return false
    case 'auto':
      return isConfigured
  }
}

/**
 * Required checks that must pass for overall readiness
 */
export const REQUIRED_CHECKS: CheckKey[] = ['DATABASE', 'CACHE']

/**
 * Optional checks that can fail without causing overall failure
 */
export const OPTIONAL_CHECKS: CheckKey[] = [
  'QUEUE_REDIS',
  'SEARCH_FULLTEXT',
  'SEARCH_VECTOR',
  'KMS',
  'EMAIL_DELIVERY',
  'EXTERNAL_AI_PROVIDERS',
]
