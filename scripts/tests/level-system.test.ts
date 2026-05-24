import CONFIG from "../config";
import stateStore from "../game/state-store";
import { LevelSystem } from "../game/level-system";
import { GameEvents, EVENTS } from "../utils/event-system";
import { ILevelSystem } from "../types/player-types";

function createMockPlayer() {
  return {
    levelSystem: null as ILevelSystem | null,
    setLevelSystem(levelSystem: ILevelSystem) {
      this.levelSystem = levelSystem;
    },
  };
}

describe("LevelSystem deterministic progression", () => {
  beforeEach(() => {
    GameEvents.removeAllListeners();
    stateStore.levelSystem.level.set(1);
    stateStore.levelSystem.kills.set(0);
    stateStore.levelSystem.killsToNextLevel.set(CONFIG.LEVEL.KILLS_FOR_LEVELS[1]);
    stateStore.player.level.set(1);
  });

  afterEach(() => {
    GameEvents.removeAllListeners();
  });

  test("increments kills without leveling before the threshold", () => {
    const player = createMockPlayer();
    const levelSystem = new LevelSystem(player as any);

    const leveled = levelSystem.addKill();

    expect(leveled).toBe(false);
    expect(levelSystem.getKills()).toBe(1);
    expect(levelSystem.getLevel()).toBe(1);
  });

  test("emits typed player level-up payload at the configured threshold", () => {
    const player = createMockPlayer();
    const levelSystem = new LevelSystem(player as any);
    const levelUpHandler = jest.fn();
    GameEvents.on(EVENTS.PLAYER_LEVEL_UP, levelUpHandler);

    let leveled = false;
    for (let i = 0; i < CONFIG.LEVEL.KILLS_FOR_LEVELS[1]; i++) {
      leveled = levelSystem.addKill();
    }

    expect(leveled).toBe(true);
    expect(levelSystem.getLevel()).toBe(2);
    expect(levelUpHandler).toHaveBeenCalledWith({
      player,
      level: 2,
    });
  });

  test("reset restores the initial deterministic progression state", () => {
    const player = createMockPlayer();
    const levelSystem = new LevelSystem(player as any);

    levelSystem.forceLevelUp();
    levelSystem.addKill();
    levelSystem.reset();

    expect(levelSystem.getLevel()).toBe(1);
    expect(levelSystem.getKills()).toBe(0);
    expect(levelSystem.getKillsToNextLevel()).toBe(CONFIG.LEVEL.KILLS_FOR_LEVELS[1]);
  });
});
