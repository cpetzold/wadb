import { format } from "date-fns";
import {
  findLast,
  forEach,
  indexBy,
  isEmpty,
  join,
  map,
  prop,
  split,
  values,
} from "ramda";
import { TypedRegEx } from "typed-regex";

type Player = {
  name: string;
  addr: string;
  lang: string;
  build: string;
  spectator: boolean;
  local: boolean;
  host: boolean;
};

type Team = {
  player?: string;
  name: string;
  color: string;
  cpu: boolean;
  cpuLevel?: number;
  turnCount: number;
  turnTime: number;
  retreatTime: number;
  totalTime: number;
  won: boolean;
};

type BaseEvent = {
  timestamp: number;
};

type ChatEvent = BaseEvent & {
  type: "chat";
  player: string;
  message: string;
};

type TurnEvent = BaseEvent & {
  team: string;
  turn: number;
  globalTurn: number;
};

type StartTurnEvent = TurnEvent & {
  type: "startTurn";
};

type EndTurnEvent = TurnEvent & {
  type: "endTurn";
  turnTime: number;
  retreatTime: number;
  lostControl: boolean;
};

type UseWeaponEvent = TurnEvent & {
  type: "useWeapon";
  weapon: string;
};

type FireWeaponEvent = TurnEvent & {
  type: "fireWeapon";
  weapon: string;
};

type Damage = {
  toTeam: string;
  amount: number;
  kills: number;
};

type DamageEvent = TurnEvent & {
  type: "damage";
  damages: Damage[];
};

type GameEndEvent = BaseEvent & {
  type: "gameEnd";
  reason: "roundFinish" | "altF4";
};

type Event =
  | ChatEvent
  | StartTurnEvent
  | EndTurnEvent
  | UseWeaponEvent
  | FireWeaponEvent
  | DamageEvent
  | GameEndEvent;

type Mission = {
  number: number;
  name: string;
  successful: boolean;
};

export type WAGame = {
  id?: string;
  buildVersion: string;
  engineVersion: string;
  fileFormatVersion: string;
  exportedWithVersion: string;

  type?: "training" | "mission" | "deathmatch" | "quick" | "online";
  startedAt: Date;
  mission?: Mission;
  matchComplete?: boolean;
  round: number;
  roundTime?: number;
  totalTime?: number;
  players: { [name: string]: Player };
  teams: { [name: string]: Team };
  events: Event[];
};

const buildVersionRegex = TypedRegEx(
  "^Build Version: (?<buildVersion>.*)$",
  "gm"
);
const idRegex = TypedRegEx('^Game ID: "(?<id>.*)"', "gm");
const startedAtRegex = TypedRegEx("^Game Started at (?<startedAt>.*)$", "gm");
const engineVersionRegex = TypedRegEx(
  "^Game Engine Version: (?<engineVersion>.*)$",
  "gm"
);
const fileFormatVersionRegex = TypedRegEx(
  "^File Format Version: (?<fileFormatVersion>.*)$",
  "gm"
);
const exportedWithVersionRegex = TypedRegEx(
  "^Exported with Version: (?<exportedWithVersion>.*)$",
  "gm"
);

const missionRegex = TypedRegEx(
  "^Mission #(?<number>\\d+): (?<name>.*).$",
  "gm"
);
const missionStatusRegex = TypedRegEx(
  "^Mission (?<status>(Successful|Failed))$",
  "gm"
);

const roundRegex = TypedRegEx("^End of round (?<round>\\d+)$", "gm");
const roundTimeRegex = TypedRegEx("^Round time: (?<roundTime>.*)$", "gm");
const totalTimeRegex = TypedRegEx(
  "^Total game time elapsed: (?<totalTime>.*)$",
  "gm"
);

const winnerRegex = TypedRegEx(
  "^(?<teamName>.*) wins the (?<gameType>(match|round))(!|\\.)$",
  "gm"
);

const playerRegex = TypedRegEx(
  '^(?<colorOrSpectator>Red|Green|Blue|Yellow|Magenta|Cyan|Spectator):\\s+"(?<name>[^"]+)"(\\s+as)?\\s+("(?<teamName>[^"]+)")*.*(\\(addr: (?<addr>[^\\)]+)\\)\\s+)?\\(lang: (?<lang>[^\\)]+)\\)\\s+\\(build: (?<build>.*\\])\\)\\s*(?<local>\\[Local Player\\])?\\s*(?<host>\\[Host\\])?$',
  "gm"
);

const offlineTeamRegex = TypedRegEx(
  '^(?<color>Red|Green|Blue|Yellow|Magenta|Cyan):\\s+"(?<name>[^"]+)"(\\s+\\[CPU (?<cpuLevel>[^\\]]+)\\])?$',
  "gm"
);

const teamTimeTotalsRegex = TypedRegEx(
  "^(?<teamName>.+):\\s+Turn: (?<turnTime>[^,]+), Retreat: (?<retreatTime>[^,]+), Total: (?<totalTime>[^,]+), Turn count: (?<turnCount>\\d+)$",
  "gm"
);

const eventRegex = TypedRegEx("^\\[\\d{2}:\\d{2}:\\d{2}\\.\\d{2}\\].*$", "gm");

const chatEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] \\[(?<playerName>[^\\]]+)\\] (?<message>.*)$",
  "gm"
);

const startTurnEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.*)( \\((?<playerName>[^\\)]+)\\))? starts turn$",
  "gm"
);

const endTurnEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.*)( \\((?<playerName>[^\\)]+)\\))? (?<reason>(ends turn|loses turn due to loss of control)); time used: (?<turnTime>[\\d\\.]+) sec turn, (?<retreatTime>[\\d\\.]+) sec retreat$",
  "gm"
);

const useWeaponEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.*)( \\((?<playerName>[^\\)]+)\\))? uses (?<weapon>.*)$",
  "gm"
);

const fireWeaponEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.*)( \\((?<playerName>[^\\)]+)\\))? fires (?<weapon>.*)$",
  "gm"
);

const damageEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• Damage dealt: (?<damages>.*)$",
  "gm"
);

const damageRegex = TypedRegEx(
  "^(?<amount>\\d+)( \\((?<kills>\\d+) kills?\\))? to (?<teamName>.*)( \\((?<playerName>[^\\)]+)\\))?$",
  "gm"
);

const gameEndEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• Game Ends - (?<reason>.*)$",
  "gm"
);

function parseDamage(damageStr: string): Damage {
  const damage = damageRegex.captures(damageStr);

  if (!damage) {
    throw new Error("Failed to parse damage");
  }

  return {
    amount: parseInt(damage.amount),
    kills: parseInt(damage.kills) || 0,
    toTeam: damage.teamName,
  };
}

function parseEvent(event: string): Event | undefined {
  const chatEvent = chatEventRegex.captures(event);
  if (chatEvent) {
    return {
      type: "chat",
      timestamp: parseTimestamp(chatEvent.timestamp),
      player: chatEvent.playerName,
      message: chatEvent.message,
    } as ChatEvent;
  }

  const startTurnEvent = startTurnEventRegex.captures(event);
  if (startTurnEvent) {
    return {
      type: "startTurn",
      timestamp: parseTimestamp(startTurnEvent.timestamp),
      team: startTurnEvent.teamName,
    } as StartTurnEvent;
  }

  const endTurnEvent = endTurnEventRegex.captures(event);
  if (endTurnEvent) {
    return {
      type: "endTurn",
      timestamp: parseTimestamp(endTurnEvent.timestamp),
      team: endTurnEvent.teamName,
      turnTime: parseFloat(endTurnEvent.turnTime) * 1000,
      retreatTime: parseFloat(endTurnEvent.retreatTime) * 1000,
      lostControl: endTurnEvent.reason === "loses turn due to loss of control",
    } as EndTurnEvent;
  }

  const useWeaponEvent = useWeaponEventRegex.captures(event);
  if (useWeaponEvent) {
    return {
      type: "useWeapon",
      timestamp: parseTimestamp(useWeaponEvent.timestamp),
      team: useWeaponEvent.teamName,
      weapon: useWeaponEvent.weapon,
    } as UseWeaponEvent;
  }

  const fireWeaponEvent = fireWeaponEventRegex.captures(event);
  if (fireWeaponEvent) {
    return {
      type: "fireWeapon",
      timestamp: parseTimestamp(fireWeaponEvent.timestamp),
      team: fireWeaponEvent.teamName,
      weapon: fireWeaponEvent.weapon,
    } as FireWeaponEvent;
  }

  const damageEvent = damageEventRegex.captures(event);
  if (damageEvent) {
    return {
      type: "damage",
      timestamp: parseTimestamp(damageEvent.timestamp),
      damages: map(parseDamage, split(", ", damageEvent.damages)),
    } as DamageEvent;
  }

  const gameEndEvent = gameEndEventRegex.captures(event);
  if (gameEndEvent) {
    return {
      type: "gameEnd",
      timestamp: parseTimestamp(gameEndEvent.timestamp),
      reason:
        gameEndEvent.reason === "User Quit with Alt+F4"
          ? "altF4"
          : "roundFinish",
    } as GameEndEvent;
  }

  return undefined;
}

export function parseGameLog(log: string): WAGame {
  const buildVersion = buildVersionRegex.captures(log)!.buildVersion;
  const id = idRegex.captures(log)?.id;
  const startedAt = startedAtRegex.captures(log)!.startedAt;
  const engineVersion = engineVersionRegex.captures(log)!.engineVersion;
  const fileFormatVersion =
    fileFormatVersionRegex.captures(log)!.fileFormatVersion;
  const exportedWithVersion =
    exportedWithVersionRegex.captures(log)!.exportedWithVersion;
  const roundCapture = roundRegex.captures(log)?.round;
  const round = roundCapture ? parseInt(roundCapture) : 1;

  const missionCapture = missionRegex.captures(log);
  const missionStatusCapture = missionStatusRegex.captures(log)?.status;

  const mission: Mission | undefined = missionCapture
    ? {
        name: missionCapture.name,
        number: parseInt(missionCapture.number),
        successful: missionStatusCapture
          ? missionStatusCapture === "Successful"
          : false,
      }
    : undefined;

  const totalTimeCapture = totalTimeRegex.captures(log)?.totalTime;
  const totalTime = totalTimeCapture
    ? parseTimestamp(totalTimeCapture)
    : undefined;

  const winnerCaptures = winnerRegex.captures(log);
  const winningTeam = winnerCaptures?.teamName;
  const matchComplete = winnerCaptures
    ? winnerCaptures.gameType === "match"
    : undefined;

  const teamTimeTotals = indexBy(
    prop("teamName"),
    map((capture) => {
      return {
        teamName: capture!.teamName,
        turnCount: parseInt(capture!.turnCount),
        turnTime: parseTimestamp(capture!.turnTime),
        retreatTime: parseTimestamp(capture!.retreatTime),
        totalTime: parseTimestamp(capture!.totalTime),
      };
    }, teamTimeTotalsRegex.captureAll(log))
  );

  const players: { [name: string]: Player } = {};
  const teams: { [name: string]: Team } = {};

  forEach((capture) => {
    if (!capture) {
      return;
    }

    const { colorOrSpectator, name, teamName, addr, lang, build, local, host } =
      capture;

    const spectator = colorOrSpectator == "Spectator";

    players[name] = {
      name,
      addr,
      lang,
      build: build.replace(/\s+/g, " "),
      spectator,
      local: !!local,
      host: !!host,
    };

    if (!spectator) {
      teams[teamName] = {
        player: name,
        name: teamName,
        color: colorOrSpectator,
        cpu: false,
        won: teamName === winningTeam,
        ...teamTimeTotals[teamName]!,
      };
    }
  }, playerRegex.captureAll(log));

  forEach((capture) => {
    if (!capture) {
      return;
    }

    const { color, name, cpuLevel } = capture;

    teams[name] = {
      name,
      color,
      cpu: !!cpuLevel,
      cpuLevel: cpuLevel ? parseFloat(cpuLevel) : undefined,
      won: name === winningTeam,
      ...teamTimeTotals[name]!,
    };
  }, offlineTeamRegex.captureAll(log));

  const eventStrs = map((match) => match.raw[0], eventRegex.matchAll(log));
  const events: Event[] = [];

  let activeTeam: string = "";
  const turns: { [teamName: string]: number } = {};
  let globalTurn = 0;

  for (const eventStr of eventStrs) {
    const event = parseEvent(eventStr);
    if (!event) {
      continue;
    }

    if (event.type == "startTurn") {
      activeTeam = event.team;
      turns[event.team] = (turns[event.team] || 0) + 1;
      globalTurn++;
    }

    switch (event.type) {
      case "startTurn":
      case "endTurn":
      case "fireWeapon":
      case "damage":
        event.turn = turns[activeTeam];
        event.globalTurn = globalTurn;
        break;
    }

    if (event.type === "damage") {
      event.team = activeTeam;
    }

    events.push(event);
  }

  const roundTimeCapture = roundTimeRegex.captures(log);
  const roundTime = roundTimeCapture
    ? parseTimestamp(roundTimeCapture.roundTime)
    : findLast((event) => event.type === "gameEnd", events)?.timestamp;

  let type: WAGame["type"];

  if (mission) {
    type = "mission";
  } else if (!isEmpty(players)) {
    type = "online";
  }

  return {
    buildVersion,
    engineVersion,
    exportedWithVersion,
    fileFormatVersion,
    id,
    type,
    startedAt: new Date(startedAt),
    round,
    mission,
    roundTime,
    totalTime,
    matchComplete,
    players,
    teams,
    events,
  };
}

export function parseTimestamp(str: string): number {
  const {
    // @ts-ignore
    groups: { h, m, s, cs },
  } = str.match(/(?<h>\d{1,2}):(?<m>\d{2}):(?<s>\d{2})(\.(?<cs>\d{2}))?/);
  return (
    (parseInt(h) * 60 * 60 + parseInt(m) * 60 + parseInt(s)) * 1000 +
    parseInt(cs ? cs : 0) * 10
  );
}

export function replayFilename(game: WAGame): string {
  const startedAt = format(game.startedAt, "yyyy-MM-dd HH.mm.ss");
  const playerList = join(
    ", ",
    map(
      (player) => (player.local ? `@` : "") + player.name,
      values(game.players)
    )
  );
  return `${startedAt} [WADB] ${playerList}.wagame`;
}
