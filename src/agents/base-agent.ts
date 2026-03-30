// =============================================================================
// Tideworks Agent Office - BaseAgent Abstract Class
// =============================================================================

import {
  AgentId,
  AgentMessage,
  AgentMessageType,
  AgentState,
  AgentStatus,
  AGENT_CONFIGS,
  ExecutionMode,
} from './types';

// ---------------------------------------------------------------------------
// Event Emitter (lightweight, no external deps)
// ---------------------------------------------------------------------------

export type AgentEventType =
  | 'status_change'
  | 'message'
  | 'error'
  | 'step_complete'
  | 'task_complete';

export interface AgentEvent {
  type: AgentEventType;
  agentId: AgentId;
  payload: unknown;
  timestamp: number;
}

type EventHandler = (event: AgentEvent) => void;

export class AgentEventEmitter {
  private handlers: Map<AgentEventType, Set<EventHandler>> = new Map();

  on(type: AgentEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: AgentEventType, handler: EventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  emit(type: AgentEventType, agentId: AgentId, payload: unknown): void {
    const event: AgentEvent = {
      type,
      agentId,
      payload,
      timestamp: Date.now(),
    };
    this.handlers.get(type)?.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`[AgentEventEmitter] handler error for ${type}:`, err);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Claude Client Interface (abstraction over actual API client)
// ---------------------------------------------------------------------------

export interface ClaudeClient {
  sendMessage(
    systemPrompt: string,
    userMessage: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// BaseAgent Abstract Class
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let messageCounter = 0;

function generateMessageId(): string {
  messageCounter += 1;
  return `msg_${Date.now()}_${messageCounter}`;
}

export abstract class BaseAgent {
  readonly id: AgentId;
  protected claude: ClaudeClient;
  protected state: AgentState;
  protected emitter: AgentEventEmitter;

  constructor(id: AgentId, claudeClient: ClaudeClient) {
    this.id = id;
    this.claude = claudeClient;

    const config = AGENT_CONFIGS[id];
    this.state = {
      id,
      name: config.name,
      emoji: config.emoji,
      status: 'idle',
      currentTask: undefined,
      messages: [],
      color: config.color,
    };

    this.emitter = new AgentEventEmitter();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getState(): Readonly<AgentState> {
    return { ...this.state, messages: [...this.state.messages] };
  }

  getEmitter(): AgentEventEmitter {
    return this.emitter;
  }

  async run(input: unknown, mode: ExecutionMode): Promise<unknown> {
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      try {
        this.setStatus('thinking');
        this.setCurrentTask('Analyzing input...');

        // Step 1: Perceive
        const perception = await this.perceive(input);
        this.addMessage('Perception complete', 'status');

        // Step 2: Reason
        this.setStatus('thinking');
        this.setCurrentTask('Reasoning about data...');
        const reasoning = await this.reason(perception);
        this.addMessage('Reasoning complete', 'status');

        // Step 3: Plan
        this.setCurrentTask('Creating action plan...');
        const plan = await this.plan(reasoning);
        this.addMessage('Plan created', 'status');

        // Step 4: Execute
        this.setStatus('working');
        this.setCurrentTask('Executing plan...');
        const result = await this.execute(plan, mode);
        this.addMessage('Execution complete', 'status');

        // Step 5: Evaluate
        this.setCurrentTask('Evaluating results...');
        const evaluation = await this.evaluate(result);

        if (!evaluation.passed) {
          throw new Error(
            `Evaluation failed: ${evaluation.reason ?? 'quality check did not pass'}`
          );
        }

        this.setStatus('done');
        this.setCurrentTask(undefined);
        this.addMessage(
          JSON.stringify(evaluation.output),
          'json',
          { step: 'final_output' }
        );

        this.emitter.emit('task_complete', this.id, evaluation.output);
        return evaluation.output;
      } catch (error) {
        retryCount += 1;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (retryCount > MAX_RETRIES) {
          return this.handleError(errorMessage);
        }

        this.addMessage(
          `Retry ${retryCount}/${MAX_RETRIES}: ${errorMessage}`,
          'status'
        );
        await this.delay(RETRY_DELAY_MS * retryCount);
      }
    }

    return this.handleError('Max retries exceeded');
  }

  // -------------------------------------------------------------------------
  // Abstract Methods (Cognitive Loop)
  // -------------------------------------------------------------------------

  /** Parse and structure raw input into a perception object. */
  protected abstract perceive(input: unknown): Promise<unknown>;

  /** Analyze the perception, decide what needs to happen. */
  protected abstract reason(perception: unknown): Promise<unknown>;

  /** Create a concrete action plan from the reasoning. */
  protected abstract plan(reasoning: unknown): Promise<unknown>;

  /** Execute the plan, potentially calling tools or Claude. */
  protected abstract execute(
    plan: unknown,
    mode: ExecutionMode
  ): Promise<unknown>;

  /** Validate the execution result for quality. */
  protected abstract evaluate(
    result: unknown
  ): Promise<{ passed: boolean; reason?: string; output: unknown }>;

  // -------------------------------------------------------------------------
  // State Management Helpers
  // -------------------------------------------------------------------------

  protected setStatus(status: AgentStatus): void {
    this.state.status = status;
    this.emitter.emit('status_change', this.id, { status });
  }

  protected setCurrentTask(task: string | undefined): void {
    this.state.currentTask = task;
  }

  protected addMessage(
    content: string,
    type: AgentMessageType = 'text',
    metadata?: Record<string, unknown>
  ): AgentMessage {
    const message: AgentMessage = {
      id: generateMessageId(),
      agentId: this.id,
      content,
      type,
      timestamp: Date.now(),
      metadata,
    };
    this.state.messages.push(message);
    this.emitter.emit('message', this.id, message);
    return message;
  }

  protected async callClaude(
    userMessage: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const config = AGENT_CONFIGS[this.id];
    return this.claude.sendMessage(config.systemPrompt, userMessage, options);
  }

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  private handleError(errorMessage: string): never {
    this.setStatus('error');
    this.setCurrentTask(undefined);
    const fullMessage = `[${this.state.name}] Error: ${errorMessage}`;
    this.addMessage(fullMessage, 'text', { error: true });
    this.emitter.emit('error', this.id, { error: errorMessage });
    throw new Error(fullMessage);
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
