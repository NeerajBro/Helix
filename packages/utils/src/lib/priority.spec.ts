import { calculatePriorityScore } from './priority';
import { PRIORITY_WEIGHTS } from '@helix/shared';

describe('calculatePriorityScore', () => {
  it('should return LOW priority for empty input', () => {
    const result = calculatePriorityScore({});
    expect(result.total).toBe(0);
    expect(result.recommendedPriority).toBe('LOW');
    expect(result.factors).toHaveLength(0);
  });

  it('should score VIP customer', () => {
    const result = calculatePriorityScore({ isVip: true });
    expect(result.total).toBe(PRIORITY_WEIGHTS.VIP);
    expect(result.factors).toHaveLength(1);
  });

  it('should combine multiple factors', () => {
    const result = calculatePriorityScore({
      isVip: true,
      isComplaint: true,
      waitingMinutes: 30,
    });
    expect(result.total).toBe(
      PRIORITY_WEIGHTS.VIP + PRIORITY_WEIGHTS.COMPLAINT + 30 * PRIORITY_WEIGHTS.WAITING_TIME_PER_MINUTE,
    );
    expect(result.recommendedPriority).toBe('CRITICAL');
  });

  it('should detect CRITICAL priority', () => {
    const result = calculatePriorityScore({
      isVip: true,
      isComplaint: true,
      slaBreached: true,
    });
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.recommendedPriority).toBe('CRITICAL');
  });

  it('should add WhatsApp expiry factor when window is closing', () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = calculatePriorityScore({ whatsappExpiresAt: expiresAt });
    expect(result.factors.some((f) => f.name === 'WhatsApp Window Expiring')).toBe(true);
  });

  it('should add negative sentiment factor', () => {
    const result = calculatePriorityScore({ sentimentScore: -0.5 });
    expect(result.factors.some((f) => f.name === 'Negative Sentiment')).toBe(true);
  });
});
