import { PRIORITY_WEIGHTS } from '@helix/shared';
import { PriorityInput, PriorityScoreBreakdown } from '@helix/types';

export function calculatePriorityScore(input: PriorityInput): PriorityScoreBreakdown {
  const factors: { name: string; score: number }[] = [];

  if (input.isVip) {
    factors.push({ name: 'VIP Customer', score: PRIORITY_WEIGHTS.VIP });
  }
  if (input.isComplaint) {
    factors.push({ name: 'Complaint', score: PRIORITY_WEIGHTS.COMPLAINT });
  }
  if (input.isUrgentTravel) {
    factors.push({ name: 'Urgent Travel', score: PRIORITY_WEIGHTS.URGENT_TRAVEL });
  }
  if (
    input.sentimentScore !== undefined &&
    input.sentimentScore < PRIORITY_WEIGHTS.NEGATIVE_SENTIMENT_THRESHOLD
  ) {
    factors.push({ name: 'Negative Sentiment', score: PRIORITY_WEIGHTS.NEGATIVE_SENTIMENT });
  }
  if (input.waitingMinutes && input.waitingMinutes > 0) {
    factors.push({
      name: 'Waiting Time',
      score: input.waitingMinutes * PRIORITY_WEIGHTS.WAITING_TIME_PER_MINUTE,
    });
  }
  if (input.whatsappExpiresAt) {
    const expiresAt = new Date(input.whatsappExpiresAt);
    const hoursRemaining = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining > 0 && hoursRemaining <= PRIORITY_WEIGHTS.WHATSAPP_EXPIRY_THRESHOLD_HOURS) {
      factors.push({ name: 'WhatsApp Window Expiring', score: PRIORITY_WEIGHTS.WHATSAPP_EXPIRY });
    }
  }
  if (input.slaBreached) {
    factors.push({ name: 'SLA Breach', score: PRIORITY_WEIGHTS.SLA_BREACH });
  }

  const total = factors.reduce((sum, f) => sum + f.score, 0);

  let recommendedPriority = 'NORMAL';
  if (total >= 80) recommendedPriority = 'CRITICAL';
  else if (total >= 55) recommendedPriority = 'URGENT';
  else if (total >= 30) recommendedPriority = 'HIGH';
  else if (total < 10) recommendedPriority = 'LOW';

  return { total, factors, recommendedPriority };
}
