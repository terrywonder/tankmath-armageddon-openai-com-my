import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BattlefieldCanvas,
  createParticlePool,
  spawnParticles,
  type BattlefieldSimulationState,
} from './components/BattlefieldCanvas';
import { GameHUD, type HudSnapshot } from './components/GameHUD';
import { LeaderboardModal } from './components/LeaderboardModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { StatusModals } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import { UpgradeShopModal } from './components/UpgradeShopModal';
import {
  TUTORIAL_STAGES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './game/constants';
import {
  calculateShotScore,
  computeAdaptiveTier,
  generateMathQuestion,
} from './game/mathEngine';
import {
  applyBlastDamage,
  carveCrater,
  createProjectile,
  generateTerrain,
  getTerrainY,
  solveEnemyBallistics,
  stepProjectile,
} from './game/physics';
import { soundEngine } from './game/sound';
import {
  calculateRunCredits,
  getEffectiveWeaponSpec,
  purchaseWeaponUpgrade,
  unlockWeaponWithCredits,
} from './game/upgrades';
import type {
  EnemyArchetype,
  GameMode,
  GameScreenState,
  LeaderboardEntry,
  MathQuestion,
  MathTier,
  PlayerSaveData,
  QualityTier,
  RunStats,
  TankEntity,
  UpgradeStatKey,
  WeaponId,
} from './game/types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  auth,
  fetchGlobalLeaderboard,
  loadSaveFromCloud,
  signInWithGoogle,
  signOutUser,
  syncSaveToCloud,
  upsertLeaderboardEntry,
} from './services/firebase';
import {
  applyRunStatsToSave,
  cacheLeaderboard,
  hasPendingSync,
  loadCachedLeaderboard,
  loadLocalSave,
  markPendingSync,
  mergeSaves,
  writeLocalSave,
} from './services/storage';

const SPEC_ORDER: QualityTier[] = ['eco', 'balanced', 'high'];

interface PortalBridgeApi {
  getActiveUserStats?: () => {
    name?: string;
    ageBand?: string;
    lang?: string;
    totalXp?: number;
  };
  updateActiveProfile?: (u: Record<string, unknown>) => unknown;
  reportGameEvent?: (p: Record<string, unknown>) => { totalXp?: number } | null;
  getLeaderboard?: (filter?: string) => Array<{
    id?: string;
    name?: string;
    rawName?: string;
    tankXp?: number;
    totalXp?: number;
    level?: number;
  }>;
  subscribe?: (cb: () => void) => () => void;
}

function getPortalApi(): PortalBridgeApi | undefined {
  return (window as unknown as { OpenAIPortal?: PortalBridgeApi }).OpenAIPortal;
}

function ageBandToMathTier(ageBand?: string): MathTier {
  if (ageBand === '5-6') return 1;
  if (ageBand === '7-9' || ageBand === '10-12') return 2;
  if (ageBand === '13-15') return 3;
  if (ageBand === '16+') return 5;
  return 2;
}

function buildEnemyTank(
  archetype: EnemyArchetype,
  index: number,
  x: number,
  terrain: Float32Array,
  hpOverride?: number
): TankEntity {
  const y = getTerrainY(terrain, x);
  const cfg =
    archetype === 'boss'
      ? { name: 'Armor Boss', hp: hpOverride ?? 140, shield: 40, color: '#7C3AED', accent: '#A78BFA' }
      : archetype === 'mortar'
        ? { name: 'Heavy Mortar', hp: hpOverride ?? 85, shield: 0, color: '#D97706', accent: '#FBBF24' }
        : { name: 'Scout Tank', hp: hpOverride ?? 65, shield: 0, color: '#DC2626', accent: '#F87171' };

  return {
    id: `enemy_${index}_${Date.now()}`,
    name: cfg.name,
    isPlayer: false,
    archetype,
    x,
    y,
    vx: 0,
    angleDeg: 135,
    power: 68,
    hp: cfg.hp,
    maxHp: cfg.hp,
    shield: cfg.shield,
    color: cfg.color,
    accentColor: cfg.accent,
    hitFlashTimer: 0,
    koTimer: 0,
    isAlive: true,
    facing: -1,
  };
}

function createInitialTitleSim(tankColor: string): BattlefieldSimulationState {
  const terrain = generateTerrain(WORLD_WIDTH, WORLD_HEIGHT, 3, 90);
  const player: TankEntity = {
    id: 'player',
    name: 'Player',
    isPlayer: true,
    x: 165,
    y: getTerrainY(terrain, 165),
    vx: 0,
    angleDeg: 42,
    power: 72,
    hp: 100,
    maxHp: 100,
    shield: 0,
    color: tankColor,
    accentColor: '#60A5FA',
    hitFlashTimer: 0,
    koTimer: 0,
    isAlive: true,
    facing: 1,
  };
  const enemy = buildEnemyTank('scout', 0, 960, terrain, 70);
  return {
    screenState: 'title',
    mode: 'tutorial',
    wave: 1,
    maxWaves: 4,
    tier: 1,
    score: 0,
    terrain,
    terrainDirty: true,
    tanks: [player, enemy],
    projectiles: [],
    particles: createParticlePool(),
    particleCursor: 0,
    floatingTexts: [],
    windAccel: 22,
    hitstopTimer: 0,
    shakeTrauma: 0,
    recoilOffset: 0,
    arcPoints: 20,
    canPlayerAim: false,
    enemyTelegraphTimer: 0,
    enemyTelegraphTankId: null,
  };
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [save, setSave] = useState<PlayerSaveData>(() => {
    const initial = loadLocalSave();
    const portalStats = getPortalApi()?.getActiveUserStats?.();
    if (portalStats?.name && initial.displayName === 'Cadet') {
      return { ...initial, displayName: String(portalStats.name).slice(0, 40) };
    }
    return initial;
  });
  const [portalTotalXp, setPortalTotalXp] = useState<number>(() => {
    return Number(getPortalApi()?.getActiveUserStats?.()?.totalXp || 0);
  });
  const [screenState, setScreenState] = useState<GameScreenState>('title');
  const [selectedSkirmishTier, setSelectedSkirmishTier] = useState<MathTier>(() =>
    ageBandToMathTier(getPortalApi()?.getActiveUserStats?.()?.ageBand)
  );
  const [user, setUser] = useState<User | null>(null);
  const [pendingSync, setPendingSync] = useState<boolean>(() => hasPendingSync());
  const [syncing, setSyncing] = useState(false);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [upgradeShopOpen, setUpgradeShopOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() =>
    loadCachedLeaderboard()
  );
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [question, setQuestion] = useState<MathQuestion>(() => generateMathQuestion(1));
  const [runStats, setRunStats] = useState<RunStats | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    mode: 'tutorial',
    wave: 1,
    maxWaves: 4,
    stageTitle: 'Stage 1 · Basic Aim & Arithmetic',
    coachmark: TUTORIAL_STAGES[0].coachmark,
    playerHp: 100,
    playerMaxHp: 100,
    enemiesRemaining: 1,
    score: 0,
    streak: 0,
    tier: 1,
    windAccel: 0,
    angleDeg: 42,
    power: 72,
    selectedWeapon: 'standard',
    unlockedWeapons: ['standard'],
    turnPhase: 'player_aim',
    activeEnemyName: null,
    lastFeedback: null,
  });

  const simRef = useRef<BattlefieldSimulationState>(createInitialTitleSim(save.tankColor));
  const runMetaRef = useRef({
    mode: 'tutorial' as GameMode,
    wave: 1,
    maxWaves: 4 as number | null,
    tier: 1 as MathTier,
    minTier: 1 as MathTier,
    highestTier: 1 as MathTier,
    score: 0,
    streak: 0,
    bestStreak: 0,
    consecutiveMisses: 0,
    correctCount: 0,
    attemptCount: 0,
    directHits: 0,
    enemiesDefeated: 0,
    reportedXp: 0,
    reportedQuestions: 0,
    startTimeMs: Date.now(),
    selectedWeapon: 'standard' as WeaponId,
    unlockedWeapons: ['standard'] as WeaponId[],
    turnPhase: 'player_aim' as 'player_aim' | 'firing' | 'enemy_turn',
    pendingEnemyQueue: [] as string[],
    activeEnemyId: null as string | null,
    lastShotCorrect: true,
    lastShotTier: 1 as MathTier,
    lastShotStreak: 0,
    waveTransitionPending: false,
    gameOverDelayTimer: 0,
    pendingVictory: null as boolean | null,
  });

  // Keep unified OpenAI.com.my Scholar stats synced
  useEffect(() => {
    const api = getPortalApi();
    if (!api?.subscribe) return;
    return api.subscribe(() => {
      const nextStats = api.getActiveUserStats?.();
      if (nextStats) {
        if (typeof nextStats.totalXp === 'number') {
          setPortalTotalXp(nextStats.totalXp);
        }
        if (nextStats.name && save.displayName === 'Cadet') {
          setSave((prev) => ({ ...prev, displayName: String(nextStats.name).slice(0, 40) }));
        }
      }
    });
  }, [save.displayName]);

  // Keep sound engine synced
  useEffect(() => {
    soundEngine.setEnabled(save.soundEnabled);
  }, [save.soundEnabled]);

  // Mirror game state onto document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screenState;
    simRef.current.screenState = screenState;
  }, [screenState]);

  const mergeWithPortalLeaderboard = useCallback((baseEntries: LeaderboardEntry[]): LeaderboardEntry[] => {
    const portalRows = getPortalApi()?.getLeaderboard?.('tankmath-armageddon') || [];
    if (!portalRows.length) return baseEntries;
    const seen = new Set(baseEntries.map((e) => e.displayName.toLowerCase()));
    const merged = [...baseEntries];
    portalRows.forEach((row) => {
      const name = String(row.rawName || row.name || '').trim();
      const score = Math.max(0, Number(row.tankXp || 0));
      if (!name || score <= 0 || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      merged.push({
        userId: String(row.id || `portal_${name}`),
        displayName: name,
        bestScore: score,
        highestTier: (Number(row.level) >= 10 ? 5 : Number(row.level) >= 5 ? 3 : 2) as MathTier,
        accuracyPct: 92,
        bestStreak: Math.max(2, Math.min(12, Math.floor(score / 300))),
        totalSolved: Math.max(1, Math.floor(score / 45)),
        gamesPlayed: Math.max(1, Math.floor(score / 250)),
        updatedAtMs: Date.now(),
      });
    });
    return merged.sort((a, b) => b.bestScore - a.bestScore).slice(0, 25);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    if (!navigator.onLine) {
      setLeaderboardEntries(mergeWithPortalLeaderboard(loadCachedLeaderboard()));
      setLeaderboardError('Offline mode: showing cached & Portal top commanders.');
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const entries = mergeWithPortalLeaderboard(await fetchGlobalLeaderboard());
      setLeaderboardEntries(entries);
      cacheLeaderboard(entries);
    } catch {
      setLeaderboardEntries(mergeWithPortalLeaderboard(loadCachedLeaderboard()));
      setLeaderboardError('Could not reach live cloud rankings. Showing Malaysian Scholar + cached leaderboard.');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [mergeWithPortalLeaderboard]);

  const performCloudSync = useCallback(
    async (targetUser: User, currentSave: PlayerSaveData, statsForLeaderboard?: RunStats) => {
      if (!navigator.onLine) {
        markPendingSync(true);
        setPendingSync(true);
        return;
      }
      setSyncing(true);
      try {
        const cloud = await loadSaveFromCloud(targetUser.uid);
        const merged = cloud ? mergeSaves(currentSave, cloud) : currentSave;
        writeLocalSave(merged);
        setSave(merged);
        await syncSaveToCloud(targetUser.uid, merged);

        const acc =
          merged.totalAttempted > 0
            ? Math.round((merged.totalSolved / merged.totalAttempted) * 100)
            : 100;
        const peakTier = statsForLeaderboard
          ? statsForLeaderboard.highestTier
          : merged.tutorialCompleted
            ? 4
            : 2;

        if (merged.bestScore > 0) {
          await upsertLeaderboardEntry(targetUser.uid, {
            displayName: merged.displayName,
            bestScore: merged.bestScore,
            highestTier: peakTier,
            accuracyPct: acc,
            bestStreak: merged.bestStreak,
            totalSolved: merged.totalSolved,
            gamesPlayed: merged.gamesPlayed,
          });
        }
        markPendingSync(false);
        setPendingSync(false);
        void refreshLeaderboard();
      } catch {
        markPendingSync(true);
        setPendingSync(true);
      } finally {
        setSyncing(false);
      }
    },
    [refreshLeaderboard]
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const local = loadLocalSave();
        const namedLocal =
          local.displayName === 'Cadet' && nextUser.displayName
            ? { ...local, displayName: nextUser.displayName.slice(0, 40) }
            : local;
        writeLocalSave(namedLocal);
        setSave(namedLocal);
        void performCloudSync(nextUser, namedLocal);
      }
    });
    return () => unsub();
  }, [performCloudSync]);

  // Flush offline sync queue when connection returns
  useEffect(() => {
    if (isOnline && user && pendingSync) {
      void performCloudSync(user, save);
    }
  }, [isOnline, user, pendingSync, save, performCloudSync]);

  const syncHudFromSim = useCallback((feedback?: { ok: boolean; text: string } | null) => {
    const sim = simRef.current;
    const meta = runMetaRef.current;
    const player = sim.tanks.find((t) => t.isPlayer);
    const aliveEnemies = sim.tanks.filter((t) => !t.isPlayer && t.isAlive);
    const activeEnemy = sim.tanks.find((t) => t.id === meta.activeEnemyId);
    const tutorialCfg =
      meta.mode === 'tutorial'
        ? TUTORIAL_STAGES[Math.min(meta.wave - 1, TUTORIAL_STAGES.length - 1)]
        : null;

    setHud((prev) => ({
      mode: meta.mode,
      wave: meta.wave,
      maxWaves: meta.maxWaves,
      stageTitle: tutorialCfg
        ? tutorialCfg.title
        : meta.mode === 'skirmish'
          ? `Skirmish · Wave ${meta.wave}/3`
          : `Endless · Wave ${meta.wave}`,
      coachmark: tutorialCfg ? tutorialCfg.coachmark : null,
      playerHp: player ? player.hp : 0,
      playerMaxHp: player ? player.maxHp : 100,
      enemiesRemaining: aliveEnemies.length,
      score: meta.score,
      streak: meta.streak,
      tier: meta.tier,
      windAccel: sim.windAccel,
      angleDeg: player ? Math.round(player.angleDeg) : 45,
      power: player ? Math.round(player.power) : 70,
      selectedWeapon: meta.selectedWeapon,
      unlockedWeapons: [...meta.unlockedWeapons],
      turnPhase: meta.turnPhase,
      activeEnemyName: activeEnemy ? activeEnemy.name : null,
      lastFeedback: feedback !== undefined ? feedback : prev.lastFeedback,
    }));
  }, []);

  const setupWave = useCallback(
    (mode: GameMode, wave: number, startingTier: MathTier, carryHp?: number) => {
      const terrain = generateTerrain(
        WORLD_WIDTH,
        WORLD_HEIGHT,
        wave * 7 + (mode === 'tutorial' ? 1 : 19),
        mode === 'tutorial' && wave === 1 ? 65 : 95
      );

      let windAccel = 0;
      let archetypes: EnemyArchetype[] = ['scout'];
      let enemyHp = 65;
      let arcPoints = 16;
      let unlockedWeapons: WeaponId[] = [...save.unlockedWeapons];
      let tier: MathTier = startingTier;

      if (mode === 'tutorial') {
        const cfg = TUTORIAL_STAGES[Math.min(wave - 1, TUTORIAL_STAGES.length - 1)];
        const [wMin, wMax] = cfg.windRange;
        windAccel =
          wMin === 0 && wMax === 0
            ? 0
            : Math.round((wMin + Math.random() * (wMax - wMin)) * (Math.random() < 0.5 && wMin >= 0 ? 1 : 1));
        archetypes = cfg.enemyArchetypes;
        enemyHp = cfg.enemyHp;
        arcPoints = cfg.arcPoints;
        unlockedWeapons = [...cfg.unlockedWeapons];
        tier = cfg.tier;
      } else {
        const maxWind = Math.min(95, 25 + wave * 15);
        windAccel = Math.round((Math.random() * 2 - 1) * maxWind);
        if (wave === 1) {
          archetypes = ['scout'];
        } else if (wave === 2) {
          archetypes = ['scout', 'mortar'];
        } else if (wave % 4 === 0) {
          archetypes = ['scout', 'boss'];
        } else {
          archetypes = ['mortar', 'scout'];
        }
        enemyHp = 65 + (wave - 1) * 14;
        unlockedWeapons = ['standard'];
        if (runMetaRef.current.bestStreak >= 2 || save.unlockedWeapons.includes('cluster')) {
          unlockedWeapons.push('cluster');
        }
        if (runMetaRef.current.bestStreak >= 4 || save.unlockedWeapons.includes('mortar')) {
          unlockedWeapons.push('mortar');
        }
      }

      const playerX = 160;
      const player: TankEntity = {
        id: 'player',
        name: save.displayName,
        isPlayer: true,
        x: playerX,
        y: getTerrainY(terrain, playerX),
        vx: 0,
        angleDeg: 44,
        power: 60,
        hp: carryHp !== undefined ? Math.min(100, carryHp + 25) : 100,
        maxHp: 100,
        shield: 0,
        color: save.tankColor,
        accentColor: '#60A5FA',
        hitFlashTimer: 0,
        koTimer: 0,
        isAlive: true,
        facing: 1,
      };

      const enemyPositions = archetypes.length === 1 ? [930] : [800, 1000];
      const enemies = archetypes.map((arch, idx) =>
        buildEnemyTank(arch, idx, enemyPositions[idx], terrain, arch === 'boss' ? enemyHp + 45 : enemyHp)
      );

      const sim = simRef.current;
      sim.mode = mode;
      sim.wave = wave;
      sim.maxWaves = runMetaRef.current.maxWaves;
      sim.tier = tier;
      sim.score = runMetaRef.current.score;
      sim.terrain = terrain;
      sim.terrainDirty = true;
      sim.tanks = [player, ...enemies];
      sim.projectiles = [];
      sim.floatingTexts = [];
      sim.windAccel = windAccel;
      sim.arcPoints = arcPoints;
      sim.canPlayerAim = true;
      sim.enemyTelegraphTimer = 0;
      sim.enemyTelegraphTankId = null;

      runMetaRef.current.wave = wave;
      runMetaRef.current.tier = tier;
      runMetaRef.current.highestTier = Math.max(runMetaRef.current.highestTier, tier) as MathTier;
      runMetaRef.current.turnPhase = 'player_aim';
      runMetaRef.current.unlockedWeapons = unlockedWeapons;
      if (!unlockedWeapons.includes(runMetaRef.current.selectedWeapon)) {
        runMetaRef.current.selectedWeapon = 'standard';
      }
      runMetaRef.current.waveTransitionPending = false;
      runMetaRef.current.pendingVictory = null;

      setQuestion(generateMathQuestion(tier));
      syncHudFromSim(null);
    },
    [save.displayName, save.tankColor, save.unlockedWeapons, syncHudFromSim]
  );

  const startGame = useCallback(
    (mode: GameMode) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const startTier: MathTier = mode === 'tutorial' ? 1 : selectedSkirmishTier;
      runMetaRef.current = {
        mode,
        wave: 1,
        maxWaves: mode === 'tutorial' ? 4 : mode === 'skirmish' ? 3 : null,
        tier: startTier,
        minTier: startTier,
        highestTier: startTier,
        score: 0,
        streak: 0,
        bestStreak: 0,
        consecutiveMisses: 0,
        correctCount: 0,
        attemptCount: 0,
        directHits: 0,
        enemiesDefeated: 0,
        reportedXp: 0,
        reportedQuestions: 0,
        startTimeMs: Date.now(),
        selectedWeapon: 'standard',
        unlockedWeapons: ['standard'],
        turnPhase: 'player_aim',
        pendingEnemyQueue: [],
        activeEnemyId: null,
        lastShotCorrect: true,
        lastShotTier: startTier,
        lastShotStreak: 0,
        waveTransitionPending: false,
        gameOverDelayTimer: 0,
        pendingVictory: null,
      };
      setRunStats(null);
      setLeaderboardOpen(false);
      setUpgradeShopOpen(false);
      setupWave(mode, 1, startTier);
      setScreenState('playing');
    },
    [selectedSkirmishTier, setupWave]
  );

  // ?autostart=1 support for direct testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startGame('tutorial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishRun = useCallback(
    (victory: boolean) => {
      const meta = runMetaRef.current;
      const partial: Omit<RunStats, 'creditsEarned'> = {
        mode: meta.mode,
        victory,
        score: meta.score,
        waveReached: meta.wave,
        highestTier: meta.highestTier,
        correctCount: meta.correctCount,
        attemptCount: meta.attemptCount,
        bestStreak: meta.bestStreak,
        directHits: meta.directHits,
        enemiesDefeated: meta.enemiesDefeated,
        durationSec: Math.round((Date.now() - meta.startTimeMs) / 1000),
      };
      const snapshot: RunStats = {
        ...partial,
        creditsEarned: calculateRunCredits(partial),
      };
      setRunStats(snapshot);
      if (victory) {
        soundEngine.playVictory();
      }
      setScreenState('gameover');

      try {
        const portal = getPortalApi();
        const runTotalXp = Math.max(
          meta.reportedXp,
          Math.round(snapshot.score / 5),
          victory ? 60 : 15
        );
        const xpDelta = Math.max(0, runTotalXp - meta.reportedXp);
        const questionsDelta = Math.max(0, snapshot.correctCount - meta.reportedQuestions);
        const starsDelta = victory
          ? 3
          : snapshot.correctCount >= 3
            ? 2
            : snapshot.correctCount >= 1
              ? 1
              : 0;
        const updated = portal?.reportGameEvent?.({
          gameId: 'tankmath-armageddon',
          levelsDelta: victory ? 1 : 0,
          starsDelta,
          bossesDelta: snapshot.enemiesDefeated,
          questionsDelta,
          xpDelta,
          title: victory
            ? `Victory in TankMath ${snapshot.mode.toUpperCase()} (${starsDelta}★)`
            : `Completed TankMath Sortie (+${runTotalXp} XP)`,
        });
        if (updated && typeof updated.totalXp === 'number') {
          setPortalTotalXp(updated.totalXp);
        }
      } catch {
        // Ignore portal bridge errors in standalone mode
      }

      setSave((prev) => {
        const nextSave = applyRunStatsToSave(prev, snapshot);
        writeLocalSave(nextSave);
        if (user) {
          void performCloudSync(user, nextSave, snapshot);
        } else {
          markPendingSync(true);
          setPendingSync(true);
        }
        return nextSave;
      });
    },
    [performCloudSync, user]
  );

  const handleAimChange = useCallback(
    (angleDeg: number, power: number) => {
      const player = simRef.current.tanks.find((t) => t.isPlayer);
      if (!player) return;
      player.angleDeg = Math.max(5, Math.min(165, angleDeg));
      player.power = Math.max(20, Math.min(100, power));
      syncHudFromSim();
    },
    [syncHudFromSim]
  );

  const handleAnswerChoice = useCallback(
    (choice: number) => {
      const meta = runMetaRef.current;
      const sim = simRef.current;
      if (screenState !== 'playing' || meta.turnPhase !== 'player_aim') return;
      const player = sim.tanks.find((t) => t.isPlayer);
      if (!player || !player.isAlive) return;

      const isCorrect = choice === question.correctAnswer;
      meta.attemptCount += 1;
      meta.lastShotCorrect = isCorrect;
      meta.lastShotTier = meta.tier;

      if (isCorrect) {
        meta.correctCount += 1;
        meta.streak += 1;
        meta.bestStreak = Math.max(meta.bestStreak, meta.streak);
        meta.consecutiveMisses = 0;
        soundEngine.playCorrect();

        const shotXp = 10 + meta.tier * 5;
        meta.reportedXp += shotXp;
        meta.reportedQuestions += 1;
        try {
          const updated = getPortalApi()?.reportGameEvent?.({
            gameId: 'tankmath-armageddon',
            questionsDelta: 1,
            xpDelta: shotXp,
            title: `Target Locked! Tier ${meta.tier} Math Solved (+${shotXp} XP)`,
          });
          if (updated && typeof updated.totalXp === 'number') {
            setPortalTotalXp(updated.totalXp);
          }
        } catch {
          // Ignore portal bridge errors in standalone mode
        }

        if (meta.streak >= 2 && !meta.unlockedWeapons.includes('cluster')) {
          meta.unlockedWeapons.push('cluster');
        }
        if (meta.streak >= 4 && !meta.unlockedWeapons.includes('mortar')) {
          meta.unlockedWeapons.push('mortar');
        }
      } else {
        meta.streak = 0;
        meta.consecutiveMisses += 1;
        soundEngine.playWrong();
      }

      meta.lastShotStreak = meta.streak;

      // Adapt tier dynamically in skirmish & endless (tutorial tiers are stage-driven)
      if (meta.mode !== 'tutorial') {
        meta.tier = computeAdaptiveTier(
          meta.tier,
          meta.streak,
          meta.consecutiveMisses,
          meta.minTier
        );
        meta.highestTier = Math.max(meta.highestTier, meta.tier) as MathTier;
        sim.tier = meta.tier;
      }

      const weapon = getEffectiveWeaponSpec(meta.selectedWeapon, save.weaponUpgrades);
      const dmgMultiplier = isCorrect ? 1.15 : 0.45;
      const shotCount = weapon.projectiles;
      const inaccuracyDeg = isCorrect ? 0 : (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 6);

      sim.projectiles = [];
      for (let i = 0; i < shotCount; i++) {
        const spreadOffset =
          shotCount > 1 ? (i - (shotCount - 1) / 2) * weapon.spreadDeg : 0;
        const proj = createProjectile({
          tank: player,
          angleDeg: player.angleDeg + spreadOffset + inaccuracyDeg,
          power: player.power + (isCorrect ? 0 : (Math.random() - 0.5) * 12),
          damage: Math.round(weapon.baseDamage * dmgMultiplier),
          blastRadius: weapon.blastRadius,
          color: weapon.color,
          isAccurate: isCorrect,
        });
        sim.projectiles.push(proj);
      }

      sim.recoilOffset = 1;
      sim.canPlayerAim = false;
      meta.turnPhase = 'firing';
      soundEngine.playFire(isCorrect ? 1.05 : 0.85);

      const feedback = isCorrect
        ? { ok: true, text: `LOCKED ON! ${question.explanation}` }
        : { ok: false, text: `MISFIRE! Correct answer: ${question.explanation}` };

      syncHudFromSim(feedback);
    },
    [question, save.weaponUpgrades, screenState, syncHudFromSim]
  );

  const stepSimulation = useCallback(
    (dt: number) => {
      const sim = simRef.current;
      const meta = runMetaRef.current;

      if (sim.hitstopTimer > 0) {
        sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        return;
      }

      // Handle delayed gameover beat
      if (meta.pendingVictory !== null) {
        meta.gameOverDelayTimer -= dt;
        if (meta.gameOverDelayTimer <= 0) {
          const result = meta.pendingVictory;
          meta.pendingVictory = null;
          finishRun(result);
        }
        return;
      }

      // Handle enemy telegraph countdown before enemy fires
      if (meta.turnPhase === 'enemy_turn' && sim.enemyTelegraphTimer > 0) {
        sim.enemyTelegraphTimer -= dt;
        if (sim.enemyTelegraphTimer <= 0) {
          const enemy = sim.tanks.find((t) => t.id === meta.activeEnemyId && t.isAlive);
          const player = sim.tanks.find((t) => t.isPlayer && t.isAlive);
          if (enemy && player) {
            const sol = solveEnemyBallistics({
              enemy,
              target: player,
              windAccel: sim.windAccel,
              archetype: enemy.archetype ?? 'scout',
              wave: meta.wave,
            });
            enemy.angleDeg = sol.angleDeg;
            enemy.power = sol.power;
            const dmg =
              enemy.archetype === 'boss' ? 28 : enemy.archetype === 'mortar' ? 22 : 16;
            const radius = enemy.archetype === 'mortar' ? 52 : 40;
            sim.projectiles.push(
              createProjectile({
                tank: enemy,
                angleDeg: sol.angleDeg,
                power: sol.power,
                damage: dmg,
                blastRadius: radius,
                color: enemy.accentColor,
                isAccurate: true,
              })
            );
            soundEngine.playFire(0.82);
            meta.turnPhase = 'firing';
            sim.enemyTelegraphTankId = null;
            syncHudFromSim();
          }
        }
        return;
      }

      // Step projectiles
      let anyActive = false;
      for (const proj of sim.projectiles) {
        if (!proj.active) continue;
        anyActive = true;
        stepProjectile(proj, sim.windAccel, dt);

        // Trail puffs in Standard/High spec
        proj.trailTimer += dt;
        if (proj.trailTimer >= 0.045) {
          proj.trailTimer = 0;
          spawnParticles(sim, proj.x, proj.y, 1, ['#E2E8F0', '#94A3B8'], 5, 20, 2, 3.5, -10);
        }

        // Out of bounds
        if (proj.x < -40 || proj.x > WORLD_WIDTH + 40 || proj.y > WORLD_HEIGHT + 40) {
          proj.active = false;
          continue;
        }

        // Check direct tank collision or terrain collision
        const groundY = getTerrainY(sim.terrain, Math.max(0, Math.min(WORLD_WIDTH - 1, proj.x)));
        const hitTank = sim.tanks.find(
          (t) =>
            t.isAlive &&
            ((proj.fromPlayer && !t.isPlayer) || (!proj.fromPlayer && t.isPlayer)) &&
            Math.hypot(proj.x - t.x, proj.y - (t.y - 12)) <= 22
        );

        if (hitTank || proj.y >= groundY) {
          proj.active = false;
          const ix = Math.max(0, Math.min(WORLD_WIDTH - 1, proj.x));
          const iy = hitTank ? proj.y : groundY;

          carveCrater(sim.terrain, ix, iy, proj.blastRadius);
          sim.terrainDirty = true;
          sim.shakeTrauma = Math.min(1, sim.shakeTrauma + (proj.blastRadius > 55 ? 0.85 : 0.6));
          sim.hitstopTimer = proj.blastRadius > 55 ? 0.055 : 0.035;
          soundEngine.playExplosion(proj.blastRadius > 55);

          spawnParticles(
            sim,
            ix,
            iy,
            proj.blastRadius > 55 ? 24 : 16,
            ['#F59E0B', '#EF4444', '#FDE047', '#78350F'],
            60,
            240,
            3,
            7.5,
            260
          );

          const hits = applyBlastDamage(sim.tanks, ix, iy, proj.blastRadius, proj.damage);
          for (const hit of hits) {
            const target = sim.tanks.find((t) => t.id === hit.tankId);
            if (!target) continue;
            sim.floatingTexts.push({
              x: target.x,
              y: target.y - 42,
              vy: -36,
              text: `-${hit.damage} HP${hit.defeated ? ' KO!' : ''}`,
              color: target.isPlayer ? '#F87171' : '#FDE047',
              life: 1.1,
              maxLife: 1.1,
              scale: hit.defeated ? 1.3 : 1,
            });

            if (proj.fromPlayer && !target.isPlayer) {
              meta.directHits += 1;
              if (hit.defeated) meta.enemiesDefeated += 1;
              const pts = calculateShotScore({
                tier: meta.lastShotTier,
                correct: meta.lastShotCorrect,
                streak: meta.lastShotStreak,
                damageDealt: hit.damage,
                windAbs: Math.abs(sim.windAccel),
              });
              meta.score += pts + (hit.defeated ? 150 : 0);
              sim.score = meta.score;
            }
          }
          syncHudFromSim();
        }
      }

      // Resolve end of projectile flight
      if (meta.turnPhase === 'firing' && !anyActive) {
        const player = sim.tanks.find((t) => t.isPlayer);
        const aliveEnemies = sim.tanks.filter((t) => !t.isPlayer && t.isAlive);

        if (!player || !player.isAlive) {
          meta.pendingVictory = false;
          meta.gameOverDelayTimer = 0.55;
          return;
        }

        if (aliveEnemies.length === 0) {
          // Wave cleared!
          const nextWave = meta.wave + 1;
          if (meta.maxWaves !== null && nextWave > meta.maxWaves) {
            meta.pendingVictory = true;
            meta.gameOverDelayTimer = 0.55;
            return;
          }
          // Advance to next wave cleanly
          setupWave(meta.mode, nextWave, meta.tier, player.hp);
          return;
        }

        // Queue enemy turns if player just fired, or advance to next enemy / back to player
        if (meta.activeEnemyId === null) {
          meta.pendingEnemyQueue = aliveEnemies.map((e) => e.id);
        }

        const nextEnemyId = meta.pendingEnemyQueue.shift();
        if (nextEnemyId) {
          meta.activeEnemyId = nextEnemyId;
          meta.turnPhase = 'enemy_turn';
          sim.enemyTelegraphTankId = nextEnemyId;
          sim.enemyTelegraphTimer = 0.6;
          syncHudFromSim();
        } else {
          meta.activeEnemyId = null;
          meta.turnPhase = 'player_aim';
          sim.canPlayerAim = true;
          setQuestion(generateMathQuestion(meta.tier));
          syncHudFromSim(null);
        }
      }
    },
    [finishRun, setupWave, syncHudFromSim]
  );

  const handleToggleSound = useCallback(() => {
    setSave((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled, updatedAtMs: Date.now() };
      writeLocalSave(next);
      return next;
    });
  }, []);

  const handleCycleQuality = useCallback(() => {
    setSave((prev) => {
      const idx = SPEC_ORDER.indexOf(prev.preferredSpec);
      const nextSpec = SPEC_ORDER[(idx + 1) % SPEC_ORDER.length];
      const next = { ...prev, preferredSpec: nextSpec, updatedAtMs: Date.now() };
      writeLocalSave(next);
      return next;
    });
  }, []);

  const handleSelectWeapon = useCallback(
    (id: WeaponId) => {
      if (!runMetaRef.current.unlockedWeapons.includes(id)) return;
      runMetaRef.current.selectedWeapon = id;
      syncHudFromSim();
    },
    [syncHudFromSim]
  );

  // Unified Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (upgradeShopOpen) {
        if (e.key === 'Escape') setUpgradeShopOpen(false);
        return;
      }

      if (leaderboardOpen) {
        if (e.key === 'Escape') setLeaderboardOpen(false);
        return;
      }

      if (screenState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startGame('tutorial');
        }
        return;
      }

      if (screenState === 'paused') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setScreenState('playing');
        }
        return;
      }

      if (screenState !== 'playing') return;

      const key = e.key.toLowerCase();
      if (e.key === 'Escape' || key === 'p') {
        e.preventDefault();
        setScreenState('paused');
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        handleToggleSound();
        return;
      }

      if (runMetaRef.current.turnPhase !== 'player_aim') return;

      const player = simRef.current.tanks.find((t) => t.isPlayer);
      if (!player) return;

      if (e.key === 'ArrowLeft' || key === 'a') {
        e.preventDefault();
        handleAimChange(player.angleDeg + 3, player.power);
      } else if (e.key === 'ArrowRight' || key === 'd') {
        e.preventDefault();
        handleAimChange(player.angleDeg - 3, player.power);
      } else if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        handleAimChange(player.angleDeg, player.power + 5);
      } else if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        handleAimChange(player.angleDeg, player.power - 5);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (question.choices[idx] !== undefined) {
          e.preventDefault();
          handleAnswerChoice(question.choices[idx]);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleAimChange,
    handleAnswerChoice,
    handleToggleSound,
    leaderboardOpen,
    question.choices,
    screenState,
    startGame,
    upgradeShopOpen,
  ]);

  const handleOpenLeaderboard = useCallback(() => {
    setLeaderboardOpen(true);
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const handlePurchaseUpgrade = useCallback(
    (weaponId: WeaponId, stat: UpgradeStatKey) => {
      const res = purchaseWeaponUpgrade(save, weaponId, stat);
      if (!res.ok) return;
      soundEngine.playCorrect();
      writeLocalSave(res.nextSave);
      setSave(res.nextSave);
      if (user) {
        void performCloudSync(user, res.nextSave);
      } else {
        markPendingSync(true);
        setPendingSync(true);
      }
    },
    [performCloudSync, save, user]
  );

  const handleUnlockWeapon = useCallback(
    (weaponId: WeaponId) => {
      const res = unlockWeaponWithCredits(save, weaponId);
      if (!res.ok) return;
      soundEngine.playCorrect();
      writeLocalSave(res.nextSave);
      setSave(res.nextSave);
      if (user) {
        void performCloudSync(user, res.nextSave);
      } else {
        markPendingSync(true);
        setPendingSync(true);
      }
    },
    [performCloudSync, save, user]
  );

  const handleUpdateProfile = useCallback(
    (displayName: string, tankColor: string) => {
      try {
        getPortalApi()?.updateActiveProfile?.({ name: displayName });
      } catch {
        // Ignore portal bridge errors
      }
      setSave((prev) => {
        const next = { ...prev, displayName, tankColor, updatedAtMs: Date.now() };
        writeLocalSave(next);
        const player = simRef.current.tanks.find((t) => t.isPlayer);
        if (player) player.color = tankColor;
        if (user) {
          void performCloudSync(user, next);
        }
        return next;
      });
    },
    [performCloudSync, user]
  );

  return (
    <main className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      {/* Full-Bleed 2D Vector Canvas */}
      <BattlefieldCanvas
        simRef={simRef}
        qualityTier={save.preferredSpec}
        onAimChange={handleAimChange}
        onStepSimulation={stepSimulation}
      />

      <OfflineIndicator syncing={syncing} />

      {screenState === 'title' && (
        <TitleScreen
          save={save}
          portalTotalXp={portalTotalXp}
          selectedSkirmishTier={selectedSkirmishTier}
          onSelectSkirmishTier={setSelectedSkirmishTier}
          onStartGame={startGame}
          onOpenLeaderboard={handleOpenLeaderboard}
          onOpenUpgradeShop={() => setUpgradeShopOpen(true)}
          onCycleQuality={handleCycleQuality}
          onToggleSound={handleToggleSound}
          isSignedIn={Boolean(user)}
          isOnline={isOnline}
        />
      )}

      {screenState === 'playing' && (
        <GameHUD
          hud={hud}
          question={question}
          qualityTier={save.preferredSpec}
          soundEnabled={save.soundEnabled}
          weaponUpgrades={save.weaponUpgrades}
          onAdjustAngle={(delta) => {
            const p = simRef.current.tanks.find((t) => t.isPlayer);
            if (p) handleAimChange(p.angleDeg + delta, p.power);
          }}
          onAdjustPower={(delta) => {
            const p = simRef.current.tanks.find((t) => t.isPlayer);
            if (p) handleAimChange(p.angleDeg, p.power + delta);
          }}
          onSelectWeapon={handleSelectWeapon}
          onAnswerChoice={handleAnswerChoice}
          onPause={() => setScreenState('paused')}
          onToggleSound={handleToggleSound}
          onCycleQuality={handleCycleQuality}
        />
      )}

      <StatusModals
        screenState={screenState}
        runStats={runStats}
        bestScore={save.bestScore}
        credits={save.credits}
        qualityTier={save.preferredSpec}
        isSignedIn={Boolean(user)}
        isOnline={isOnline}
        onResume={() => setScreenState('playing')}
        onRestart={() => startGame(runMetaRef.current.mode)}
        onQuitToTitle={() => {
          simRef.current = createInitialTitleSim(save.tankColor);
          setScreenState('title');
        }}
        onCycleQuality={handleCycleQuality}
        onOpenLeaderboard={handleOpenLeaderboard}
        onOpenUpgradeShop={() => setUpgradeShopOpen(true)}
      />

      <UpgradeShopModal
        open={upgradeShopOpen}
        onClose={() => setUpgradeShopOpen(false)}
        save={save}
        onPurchaseUpgrade={handlePurchaseUpgrade}
        onUnlockWeapon={handleUnlockWeapon}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboardEntries}
        loading={leaderboardLoading}
        errorMsg={leaderboardError}
        save={save}
        userEmail={user?.email ?? null}
        isSignedIn={Boolean(user)}
        isOnline={isOnline}
        syncing={syncing}
        onRefresh={() => void refreshLeaderboard()}
        onSignIn={() => {
          void signInWithGoogle().catch(() => {});
        }}
        onSignOut={() => {
          void signOutUser().catch(() => {});
        }}
        onUpdateProfile={handleUpdateProfile}
        onSyncNow={() => {
          if (user) void performCloudSync(user, save);
        }}
      />
    </main>
  );
}
