export interface Intent {
  action: string
  target?: string
  params?: Record<string, unknown>
  missing?: string[]
}

export interface IntentValidationResult {
  valid: boolean
  errors: string[]
  missing: string[]
}

export interface ClarificationQuestion {
  field: string
  question: string
  context: string
}

export interface InterpretResult {
  intent: Intent | null
  clarification?: ClarificationQuestion
  raw: unknown
}
