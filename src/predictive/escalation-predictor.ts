import { EscalationPrediction, TriageResult, CustomerProfile } from '../types.js';

/**
 * EscalationPredictor
 * Predicts escalation probability for a ticket based on triage results and customer profile.
 */
export default class EscalationPredictor {
  /**
   * Predicts escalation probability and returns recommended actions.
   */
  predict(ticketId: string, triage: TriageResult, profile: CustomerProfile): EscalationPrediction {
    const signals: string[] = [];
    let probability = 0;

    // Triage-based signals
    if (triage.escalationLevel >= 2) {
      probability += 0.3 * triage.escalationLevel;
      signals.push(`High triage escalation level: ${triage.escalationLevel}`);
    }

    if (triage.sentiment === 'negative') {
      probability += 0.15;
      signals.push('Negative customer sentiment detected');
    }

    if (triage.sentimentIntensity > 0.7) {
      probability += 0.1;
      signals.push(`High sentiment intensity: ${triage.sentimentIntensity.toFixed(2)}`);
    }

    if (triage.urgencyLevel === 'critical' || triage.urgencyLevel === 'high') {
      probability += 0.15;
      signals.push(`High urgency level: ${triage.urgencyLevel}`);
    }

    if (triage.ambiguityDetected) {
      probability += 0.1;
      signals.push('Ambiguity detected in intent classification');
    }

    if (triage.confidence < 0.6) {
      probability += 0.1;
      signals.push(`Low triage confidence: ${triage.confidence.toFixed(2)}`);
    }

    // Customer profile-based signals
    if (profile.churnRisk === 'critical' || profile.churnRisk === 'high') {
      probability += 0.2;
      signals.push(`High churn risk: ${profile.churnRisk}`);
    }

    if (profile.sentimentTrajectory === 'declining') {
      probability += 0.1;
      signals.push('Declining sentiment trajectory');
    }

    if (profile.recentEscalations > 2) {
      probability += 0.1;
      signals.push(`Multiple recent escalations: ${profile.recentEscalations}`);
    }

    if (profile.openTickets > 3) {
      probability += 0.05;
      signals.push(`High open ticket count: ${profile.openTickets}`);
    }

    // Cap probability at 1.0
    probability = Math.min(probability, 1);

    // Determine recommended action
    let recommendedAction: string;
    if (probability >= 0.7) {
      recommendedAction = 'escalate_immediately';
    } else if (probability >= 0.4) {
      recommendedAction = 'monitor_closely';
    } else {
      recommendedAction = 'proceed_autonomously';
    }

    const priorityUpgrade = probability >= 0.6 && triage.urgencyLevel !== 'critical';

    return {
      ticketId,
      probability,
      signals,
      recommendedAction,
      priorityUpgrade,
    };
  }
}
