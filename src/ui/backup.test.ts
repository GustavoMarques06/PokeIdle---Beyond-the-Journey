import { describe, expect, it } from 'vitest';
import { backupDue } from './backup';

const DAY = 86_400_000;
const now = 100 * DAY;

describe('lembrete de backup', () => {
  it('não incomoda quem começou há pouco', () => {
    expect(backupDue(now, now - 2 * DAY, 0, 0)).toBe(false);
  });

  it('lembra depois de uma semana sem cópia', () => {
    expect(backupDue(now, now - 30 * DAY, 0, 0)).toBe(true);
    expect(backupDue(now, now - 30 * DAY, now - 8 * DAY, 0)).toBe(true);
    expect(backupDue(now, now - 30 * DAY, now - 3 * DAY, 0)).toBe(false);
  });

  it('"Depois" adia por alguns dias', () => {
    expect(backupDue(now, now - 30 * DAY, 0, now - DAY)).toBe(false);
    expect(backupDue(now, now - 30 * DAY, 0, now - 4 * DAY)).toBe(true);
  });
});
