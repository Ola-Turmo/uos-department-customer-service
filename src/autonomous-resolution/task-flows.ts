/**
 * UOS Customer Service — TaskFlow Engine
 * Multi-step task flow state machine for orchestrating complex autonomous operations.
 */

import type {
  TaskFlow,
  TaskFlowContext,
  TaskFlowStepResult,
  TaskFlowStepDefinition,
} from '../types.js';

// ----------------------------------------------------------------------------
// TaskFlow Engine
// ----------------------------------------------------------------------------

/**
 * TaskFlowEngine orchestrates multi-step task flows with support for:
 * - Sequential step execution
 * - Retry logic with configurable max attempts
 * - Rollback on failure (optional per step)
 * - Flow validation before execution
 */
export default class TaskFlowEngine {
  /**
   * Validates a task flow definition before execution.
   *
   * Checks:
   * - Flow has required fields (flowId, name, steps)
   * - Steps array is non-empty
   * - Each step has required fields (stepId, name, execute function)
   * - Step IDs are unique within the flow
   */
  validateFlow(flow: TaskFlow): boolean {
    if (!flow.flowId || typeof flow.flowId !== 'string') {
      return false;
    }

    if (!flow.name || typeof flow.name !== 'string') {
      return false;
    }

    if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
      return false;
    }

    const stepIds = new Set<string>();

    for (const step of flow.steps) {
      if (!step.stepId || typeof step.stepId !== 'string') {
        return false;
      }

      if (stepIds.has(step.stepId)) {
        return false; // duplicate step ID
      }
      stepIds.add(step.stepId);

      if (!step.name || typeof step.name !== 'string') {
        return false;
      }

      if (!step.description || typeof step.description !== 'string') {
        return false;
      }

      if (typeof step.execute !== 'function') {
        return false;
      }
    }

    return true;
  }

  /**
   * Executes a task flow sequentially, collecting results from each step.
   *
   * Process:
   * 1. Validates the flow
   * 2. Executes each step in order
   * 3. On step failure:
   *    - If rollbackOnFailure is true, executes rollback functions in reverse order
   *    - Respects maxRetries for each step
   * 4. Returns array of TaskFlowStepResult for all steps
   */
  async executeFlow(
    flow: TaskFlow,
    ctx: TaskFlowContext,
  ): Promise<TaskFlowStepResult[]> {
    const results: TaskFlowStepResult[] = [];

    if (!this.validateFlow(flow)) {
      return [{
        stepId: 'flow-validation',
        success: false,
        error: 'Flow validation failed',
      }];
    }

    const executedSteps: TaskFlowStepDefinition[] = [];

    for (const step of flow.steps) {
      let stepSuccess = false;
      let stepOutput: unknown;
      let stepError: string | undefined;
      let attempts = 0;

      while (attempts <= flow.maxRetries && !stepSuccess) {
        attempts++;

        try {
          const result = await step.execute(ctx);
          stepOutput = result.output;
          stepSuccess = result.success;
          stepError = result.error;

          if (!stepSuccess && attempts <= flow.maxRetries) {
            // Wait before retry (exponential backoff)
            await this.delay(Math.pow(2, attempts - 1) * 100);
          }
        } catch (err) {
          stepError = err instanceof Error ? err.message : String(err);
          stepSuccess = false;
        }
      }

      const stepResult: TaskFlowStepResult = {
        stepId: step.stepId,
        success: stepSuccess,
        output: stepOutput,
        error: stepError,
      };

      results.push(stepResult);

      if (!stepSuccess && flow.rollbackOnFailure) {
        // Execute rollbacks in reverse order for completed steps
        for (const completedStep of executedSteps.reverse()) {
          if (completedStep.rollback) {
            try {
              await completedStep.rollback(ctx);
            } catch (rollbackErr) {
              // Log rollback failure but continue with other rollbacks
              console.error(
                `[TaskFlowEngine] Rollback failed for step ${completedStep.stepId}:`,
                rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
              );
            }
          }
        }
        // Stop execution on failure when rollback is enabled
        break;
      }

      executedSteps.push(step);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
