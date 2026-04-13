import { RootCauseReport, FixType, RecurringPattern } from '../types.js';

/**
 * RootCauseAnalyzer performs causal chain tracing on recurring patterns
 * to identify root causes and recommend fixes.
 */
export default class RootCauseAnalyzer {
  /**
   * Analyzes a recurring pattern to produce a root cause report with causal chain tracing.
   * @param pattern - The recurring pattern to analyze
   * @returns A RootCauseReport with suspected root cause, causal chain, and recommended fix type
   */
  analyze(pattern: RecurringPattern): RootCauseReport {
    const { patternId, description, frequency, affectedCustomers, impactScore, relatedCategory } = pattern;

    // Trace the causal chain from surface issue to root cause
    const causalChain = this.traceCausalChain(description, relatedCategory);

    // Identify the surface issue (first element in chain)
    const surfaceIssue = causalChain[0] || description;

    // Identify suspected root cause (last element in chain)
    const suspectedRootCause = causalChain[causalChain.length - 1] || description;

    // Determine expected fix type based on pattern characteristics
    const expectedFixType = this.determineFixType(description, relatedCategory);

    // Calculate confidence based on impact score and frequency
    const confidence = this.calculateConfidence(impactScore, frequency, affectedCustomers);

    // Generate recommended investigation steps
    const recommendedInvestigation = this.generateInvestigationSteps(suspectedRootCause, expectedFixType);

    return {
      patternId,
      surfaceIssue,
      suspectedRootCause,
      confidence,
      recommendedInvestigation,
      expectedFixType,
      causalChain,
    };
  }

  /**
   * Traces the causal chain from customer symptom to root cause.
   */
  private traceCausalChain(description: string, relatedCategory: string): string[] {
    const chain: string[] = [];

    // Surface issue: what customers are experiencing
    chain.push(`Customer reports: ${description}`);

    // Surface-level categorization based on description patterns
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('error') || lowerDesc.includes('fail') || lowerDesc.includes('crash')) {
      chain.push('System-level failure detected');
      chain.push('Code defect or unexpected edge case');
      chain.push('Root cause: Software bug in production');
    } else if (lowerDesc.includes('slow') || lowerDesc.includes('delay') || lowerDesc.includes('timeout')) {
      chain.push('Performance degradation observed');
      chain.push('Resource constraint or configuration issue');
      chain.push('Root cause: Infrastructure or config misconfiguration');
    } else if (lowerDesc.includes('wrong') || lowerDesc.includes('incorrect') || lowerDesc.includes('missing')) {
      chain.push('Incorrect output or data mismatch');
      chain.push('Logic error or data consistency issue');
      chain.push('Root cause: Business logic flaw or data sync issue');
    } else if (lowerDesc.includes('policy') || lowerDesc.includes('refund') || lowerDesc.includes('billing')) {
      chain.push('Policy or billing discrepancy reported');
      chain.push('Policy interpretation or enforcement gap');
      chain.push('Root cause: Policy definition or training gap');
    } else if (lowerDesc.includes('knowledge') || lowerDesc.includes('kb') || lowerDesc.includes('article')) {
      chain.push('Knowledge gap or outdated documentation');
      chain.push('KB content not matching customer needs');
      chain.push('Root cause: Knowledge base staleness or coverage gap');
    } else {
      // Generic chain for unknown patterns
      chain.push(`Category-specific issue in ${relatedCategory}`);
      chain.push('Underlying systemic problem');
      chain.push('Root cause: Requires further investigation');
    }

    return chain;
  }

  /**
   * Determines the expected fix type based on pattern characteristics.
   */
  private determineFixType(description: string, relatedCategory: string): FixType {
    const lowerDesc = description.toLowerCase();
    const lowerCat = relatedCategory.toLowerCase();

    if (lowerDesc.includes('error') || lowerDesc.includes('fail') || lowerDesc.includes('crash') || lowerDesc.includes('bug')) {
      return 'code';
    } else if (lowerDesc.includes('config') || lowerDesc.includes('setting') || lowerDesc.includes('timeout') || lowerDesc.includes('slow')) {
      return 'config';
    } else if (lowerDesc.includes('policy') || lowerDesc.includes('refund') || lowerDesc.includes('billing') || lowerCat.includes('policy')) {
      return 'policy';
    } else {
      return 'kb';
    }
  }

  /**
   * Calculates confidence score based on pattern metrics.
   */
  private calculateConfidence(impactScore: number, frequency: number, affectedCustomers: number): number {
    // Normalize impact score to 0-1 range (assuming max impact around 1000)
    const normalizedImpact = Math.min(impactScore / 1000, 1);

    // Higher frequency and more affected customers increase confidence
    const frequencyFactor = Math.min(frequency / 50, 1) * 0.3;
    const customerFactor = Math.min(affectedCustomers / 100, 1) * 0.3;
    const impactFactor = normalizedImpact * 0.4;

    return Math.round((frequencyFactor + customerFactor + impactFactor) * 100) / 100;
  }

  /**
   * Generates recommended investigation steps based on root cause and fix type.
   */
  private generateInvestigationSteps(suspectedRootCause: string, fixType: FixType): string[] {
    const steps: string[] = [];

    switch (fixType) {
      case 'code':
        steps.push('Review recent code deployments in the affected area');
        steps.push('Check error logs and stack traces for the reported issue');
        steps.push('Identify the commit or change that introduced the defect');
        steps.push('Implement and test the code fix');
        break;
      case 'config':
        steps.push('Audit current configuration settings');
        steps.push('Compare with known-good configuration baselines');
        steps.push('Review recent configuration changes or environment updates');
        steps.push('Apply corrected configuration and monitor');
        break;
      case 'policy':
        steps.push('Review current policy documentation');
        steps.push('Analyze customer interactions for policy interpretation issues');
        steps.push('Consult with policy team for clarification or updates');
        steps.push('Update policy documentation and train relevant staff');
        break;
      case 'kb':
        steps.push('Audit existing knowledge base articles for the topic');
        steps.push('Identify gaps or outdated information');
        steps.push('Research correct resolution from similar resolved cases');
        steps.push('Update or create KB article with accurate information');
        break;
    }

    return steps;
  }
}