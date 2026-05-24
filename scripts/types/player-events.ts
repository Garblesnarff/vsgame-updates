import { IPlayer } from "./player-types";

export interface PlayerDamagePayload {
  player: IPlayer;
  damage: number;
  currentHealth: number;
  maxHealth: number;
}

export interface PlayerHealPayload {
  player: IPlayer;
  amount: number;
  currentHealth: number;
  maxHealth: number;
}

export interface PlayerDeathPayload {
  player: IPlayer;
}

export interface PlayerLevelUpPayload {
  player: IPlayer;
  level: number;
}
