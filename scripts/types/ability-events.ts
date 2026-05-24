import { Player } from "../entities/player";

export interface AbilityUsePayload {
  abilityName: string;
  player: Player;
}

export interface AbilityUpgradePayload {
  abilityName: string;
  player: Player;
}

export interface AbilityUnlockPayload {
  abilityName: string;
  player: Player;
}

export type AbilityVisualPayload =
  | { type: string; x?: number; y?: number; radius?: number; duration?: number; color?: number; alpha?: number }
  | Record<string, unknown>;
