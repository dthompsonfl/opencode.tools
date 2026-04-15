import type { Intent, IntentValidationResult, ClarificationQuestion, InterpretResult } from "@/foundry/types/intent"
import { Log } from "@/util/log"

interface IntentInterpreterOptions {
  schema: unknown
  contract: unknown
  onClarification?: (question: ClarificationQuestion) => Promise<string>
}

interface IntentInterpreter {
  interpret: (input: string, context: unknown) => Promise<InterpretResult>
  validate: (intent: unknown) => IntentValidationResult
  generateClarification: (missing: string[], context: unknown) => ClarificationQuestion
}

export function createIntentInterpreter(options: IntentInterpreterOptions): IntentInterpreter {
  const { schema, contract, onClarification } = options

  const validate = (intent: unknown): IntentValidationResult => {
    const errors: string[] = []
    const missing: string[] = []

    if (!intent || typeof intent !== "object") {
      return { valid: false, errors: ["Intent must be an object"], missing: [] }
    }

    const intentObj = intent as Record<string, unknown>

    if (!intentObj.action || typeof intentObj.action !== "string") {
      missing.push("action")
    }

    // Additional validation based on schema would go here
    // For now, we do basic structure validation

    return {
      valid: errors.length === 0 && missing.length === 0,
      errors,
      missing,
    }
  }

  const generateClarification = (missing: string[], context: unknown): ClarificationQuestion => {
    const field = missing[0]
    if (!field) {
      return {
        field: "unknown",
        question: "Could you provide more details about what you'd like to do?",
        context: "Missing required information",
      }
    }

    const questions: Record<string, string> = {
      action: "What action would you like to perform? (e.g., create, update, delete, review)",
      target: "What is the target of this action? (e.g., project, task, document)",
      phase: "Which phase are you referring to? (0-5)",
      gate: "Which gate would you like to check? (security, quality, etc.)",
    }

    return {
      field,
      question: questions[field] ?? `Please provide the ${field}`,
      context: `Missing required field: ${field}`,
    }
  }

  const interpret = async (input: string, context: unknown): Promise<InterpretResult> => {
    Log.Default.debug("intent:interpret", { input, context })

    // Simple keyword-based interpretation for now
    // In production, this would use an LLM with the NL_INTERPRETER_PROMPT
    const lowerInput = input.toLowerCase()

    let intent: Intent | null = null

    if (lowerInput.includes("setup") || lowerInput.includes("init")) {
      intent = { action: "INIT_PROJECT" }
    } else if (lowerInput.includes("gate") || lowerInput.includes("check")) {
      intent = { action: "RUN_GATES" }
    } else if (lowerInput.includes("approve")) {
      intent = { action: "APPROVE_PHASE" }
    } else if (lowerInput.includes("add task")) {
      intent = { action: "ADD_TASK", params: { description: input } }
    } else if (lowerInput.includes("complete")) {
      intent = { action: "COMPLETE_TASK" }
    } else if (lowerInput.includes("pause")) {
      intent = { action: "PAUSE" }
    } else if (lowerInput.includes("resume")) {
      intent = { action: "RESUME" }
    } else if (lowerInput.includes("abort")) {
      intent = { action: "ABORT" }
    }

    if (!intent) {
      return {
        intent: null,
        clarification: generateClarification(["action"], context),
        raw: { input },
      }
    }

    const validation = validate(intent)

    if (!validation.valid && validation.missing.length > 0) {
      if (onClarification) {
        const question = generateClarification(validation.missing, context)
        const answer = await onClarification(question)
        // Re-interpret with the answer
        return interpret(`${input} ${answer}`, context)
      }

      return {
        intent: null,
        clarification: generateClarification(validation.missing, context),
        raw: { input },
      }
    }

    return {
      intent,
      raw: { input },
    }
  }

  return {
    interpret,
    validate,
    generateClarification,
  }
}
