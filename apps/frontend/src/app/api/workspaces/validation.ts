import { sanitizeFormData, sanitizeText, sanitizeNumber } from '@/lib/security/input-sanitization'

export interface WorkspaceInput {
  name: string
  description: string
  budget?: {
    used: number
    total: number
    currency: string
  }
  channels?: string[]
}

interface ValidationOptions {
  partial?: boolean
}

export function validateWorkspaceData(
  input: any,
  options: ValidationOptions = {}
): { data: WorkspaceInput; errors: Record<string, string> } {
  const { partial = false } = options

  const { data, errors } = sanitizeFormData(input, {
    name: { type: 'text', required: !partial, maxLength: 100 },
    description: { type: 'text', required: !partial, maxLength: 500 }
  })

  if (input?.budget) {
    data.budget = {
      used: sanitizeNumber(input.budget.used, { min: 0 }) ?? 0,
      total: sanitizeNumber(input.budget.total, { min: 0 }) ?? 0,
      currency: sanitizeText(input.budget.currency, 3)
    }
  }

  if (Array.isArray(input?.channels)) {
    data.channels = input.channels
      .map((ch: string) => sanitizeText(ch, 50))
      .filter(ch => ch.length > 0)
  }

  return { data: data as WorkspaceInput, errors }
}
