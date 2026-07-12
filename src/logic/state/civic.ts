// 市政推进 + 政体/政策卡
import type { PlayerState } from './types';
import { CIVICS, GOVERNMENTS, POLICY_CARDS, type GovernmentId } from '../../gamedata';

export function canResearchCivic(player: PlayerState, civicId: string): boolean {
  const c = CIVICS[civicId];
  if (!c) return false;
  if (player.researchedCivics.includes(civicId)) return false;
  if (!c.prereqCivics.every((p) => player.researchedCivics.includes(p))) return false;
  if (!(c.prereqTechs ?? []).every((t) => player.researchedTechs.includes(t))) return false;
  return true;
}

export function advanceCivic(player: PlayerState, culture: number): string | null {
  if (!player.currentCivic) return null;
  const c = CIVICS[player.currentCivic.civicId];
  if (!c) return null;
  player.currentCivic.progress += culture;
  if (player.currentCivic.progress >= c.cost) {
    player.researchedCivics.push(c.id);
    player.currentCivic = null;
    return c.id;
  }
  return null;
}

export function canChangeGovernment(player: PlayerState, gov: GovernmentId): boolean {
  const g = GOVERNMENTS[gov];
  if (!g) return false;
  return player.researchedCivics.includes(g.unlockCivic);
}

export function changeGovernment(player: PlayerState, gov: GovernmentId): void {
  const g = GOVERNMENTS[gov];
  if (!g) return;
  player.government = gov;
  const slots = g.militarySlots + g.economicSlots + g.wildcardSlots;
  // 重置槽位（清空旧卡）
  player.policySlots = new Array(slots).fill(null);
}

export function canSwitchPolicy(player: PlayerState, cardId: string, slotIndex: number): boolean {
  const card = POLICY_CARDS[cardId];
  if (!card) return false;
  if (!player.researchedCivics.includes(card.unlockCivic)) return false;
  const gov = GOVERNMENTS[player.government];
  if (slotIndex < 0 || slotIndex >= player.policySlots.length) return false;
  const slotType = slotTypeFor(slotIndex, gov);
  if (slotType === 'wildcard') return true;
  return card.type === slotType;
}

function slotTypeFor(index: number, gov: { militarySlots: number; economicSlots: number }): 'military' | 'economic' | 'wildcard' {
  if (index < gov.militarySlots) return 'military';
  if (index < gov.militarySlots + gov.economicSlots) return 'economic';
  return 'wildcard';
}

export function switchPolicy(player: PlayerState, cardId: string, slotIndex: number): void {
  player.policySlots[slotIndex] = cardId;
}
