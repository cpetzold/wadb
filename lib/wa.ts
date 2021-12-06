import { format } from "date-fns";
import {
  filter,
  find,
  findLast,
  forEach,
  head,
  indexBy,
  isEmpty,
  join,
  map,
  prop,
  replace,
  split,
  toLower,
  toUpper,
  values,
} from "ramda";
import { TypedRegEx } from "typed-regex";

type TeamColor = "red" | "blue" | "green" | "yellow" | "magenta" | "cyan";

type Player = {
  name: string;
  addr?: string;
  lang?: string;
  build?: Build;
  spectator: boolean;
  local: boolean;
  host: boolean;
};

type Team = {
  player?: string;
  name: string;
  color: TeamColor;
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

type PrivateChatEvent = BaseEvent & {
  type: "privateChat";
  player: string;
  recipient: string;
  message: string;
};

type AlliedChatEvent = BaseEvent & {
  type: "alliedChat";
  player: string;
  color?: TeamColor;
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

type SuddenDeathEvent = BaseEvent & {
  type: "suddenDeath";
};

type GameEndEvent = BaseEvent & {
  type: "gameEnd";
  reason: "roundFinish" | "altF4";
};

type NetworkEvent = BaseEvent & {
  type: "network";
  message: string;
};

type Event =
  | ChatEvent
  | PrivateChatEvent
  | AlliedChatEvent
  | StartTurnEvent
  | EndTurnEvent
  | UseWeaponEvent
  | FireWeaponEvent
  | DamageEvent
  | SuddenDeathEvent
  | GameEndEvent
  | NetworkEvent;

type Mission = {
  number: number;
  name: string;
  successful: boolean;
};

type Build = {
  version: string;
  release?: string;
  builtAt?: Date;
};

export type WAGame = {
  id?: string;
  build?: Build;
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

const buildRegex = TypedRegEx(
  "^Build Version: v?(?<version>([\\w\\.]+( +\\w+)?))( +\\((?<release>(CD|Steam))\\))?( +\\((?<builtAt>.*)\\))?$",
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
  "^((The (?<teamColor>.*) teams w(i|o)n)|((?<teamName>.+?) (wins|won))) the (?<gameType>(match|round))(!|\\.)$",
  "gm"
);

const playerRegex = TypedRegEx(
  '^(?<colorOrSpectator>Red|Green|Blue|Yellow|Magenta|Cyan|Spectator): +"(?<name>[^"]+)"( +as)? +("(?<teamName>.+?)")?.*(\\(addr: (?<addr>[^\\)]+)\\) +)?\\(lang: (?<lang>[^\\)]+)\\) +\\(build: v?(?<buildVersion>[\\w\\.]+( +\\w+)?) *( +\\((?<buildRelease>(CD|Steam))\\))?( +\\[(?<builtAt>.*)\\])?\\) *(?<local>\\[Local Player\\])? *(?<host>\\[Host\\])?$',
  "gm"
);

const offlineTeamRegex = TypedRegEx(
  '^(?<color>Red|Green|Blue|Yellow|Magenta|Cyan): +"(?<name>[^"]+)"( +\\[CPU (?<cpuLevel>[^\\]]+)\\])?$',
  "gm"
);

const teamTimeTotalsRegex = TypedRegEx(
  "^(?<teamName>.+?)( \\((?<playerName>[^\\)]+)\\))?: +Turn: (?<turnTime>[^,]+), Retreat: (?<retreatTime>[^,]+), Total: (?<totalTime>[^,]+), Turn count: (?<turnCount>\\d+)$",
  "gm"
);

const eventRegex = TypedRegEx("^\\[\\d{2}:\\d{2}:\\d{2}\\.\\d{2}\\].*$", "gm");

const chatEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] \\[(?<playerName>[^\\]]+)\\] (?<message>.*)$",
  "gm"
);

const privateChatEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] (?<playerName>.+?)\\.\\.(?<recipientName>.+?): (?<message>.*)$",
  "gm"
);

const alliedChatEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] <<(?<playerName>[^>]+)>> (?<message>.*)$",
  "gm"
);

const startTurnEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.+?)( \\((?<playerName>[^\\)]+)\\))? starts turn$",
  "gm"
);

const endTurnEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.+?)( \\((?<playerName>[^\\)]+)\\))? (?<reason>(ends turn|loses turn due to loss of control)); time used: (?<turnTime>[\\d\\.]+) sec turn, (?<retreatTime>[\\d\\.]+) sec retreat$",
  "gm"
);

const useWeaponEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.+?)( \\((?<playerName>[^\\)]+)\\))? uses (?<weapon>.*)$",
  "gm"
);

const fireWeaponEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• (?<teamName>.+?)( \\((?<playerName>[^\\)]+)\\))? fires (?<weapon>.*)$",
  "gm"
);

const damageEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• Damage dealt: (?<damages>.*)$",
  "gm"
);

const damageRegex = TypedRegEx(
  "^(?<amount>\\d+)( \\((?<kills>\\d+) kills?\\))? to (?<teamName>.+?)( \\((?<playerName>[^\\)]+)\\))?$",
  "gm"
);

const suddenDeathEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• Sudden Death$",
  "gm"
);

const gameEndEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ••• Game Ends - (?<reason>.*)$",
  "gm"
);

const networkEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] \\*\\*\\* (?<message>.*)$",
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

  const privateChatEvent = privateChatEventRegex.captures(event);
  if (privateChatEvent) {
    return {
      type: "privateChat",
      timestamp: parseTimestamp(privateChatEvent.timestamp),
      player: privateChatEvent.playerName,
      recipient: privateChatEvent.recipientName,
      message: privateChatEvent.message,
    } as PrivateChatEvent;
  }

  const alliedChatEvent = alliedChatEventRegex.captures(event);
  if (alliedChatEvent) {
    return {
      type: "alliedChat",
      timestamp: parseTimestamp(alliedChatEvent.timestamp),
      player: alliedChatEvent.playerName,
      message: alliedChatEvent.message,
    } as AlliedChatEvent;
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

  const suddenDeathEvent = suddenDeathEventRegex.captures(event);
  if (suddenDeathEvent) {
    return {
      type: "suddenDeath",
      timestamp: parseTimestamp(suddenDeathEvent.timestamp),
    } as SuddenDeathEvent;
  }

  const networkEvent = networkEventRegex.captures(event);
  if (networkEvent) {
    return {
      type: "network",
      timestamp: parseTimestamp(networkEvent.timestamp),
      message: networkEvent.message,
    } as NetworkEvent;
  }

  return undefined;
}

export function parseGameLog(log: string, originalFilename: string): WAGame {
  const buildCaptures = buildRegex.captures(log);
  const build: Build | undefined = buildCaptures
    ? {
        version: buildCaptures.version!,
        release: buildCaptures.release,
        builtAt: buildCaptures.builtAt
          ? new Date(buildCaptures.builtAt)
          : undefined,
      }
    : undefined;
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
  const totalTime =
    totalTimeCapture && totalTimeCapture !== "Unknown"
      ? parseTimestamp(totalTimeCapture)
      : undefined;

  const winnerCaptures = winnerRegex.captures(log);
  const winningTeam = winnerCaptures?.teamName;
  const winningColor =
    winnerCaptures?.teamColor && toLower(winnerCaptures.teamColor);
  const matchComplete = winnerCaptures
    ? winnerCaptures.gameType === "match"
    : undefined;

  console.log({ winnerCaptures });

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

    const {
      colorOrSpectator,
      name,
      teamName,
      addr,
      lang,
      buildVersion,
      buildRelease,
      builtAt,
      local,
      host,
    } = capture;

    const spectator = colorOrSpectator == "Spectator";

    players[name] = {
      name,
      addr,
      lang,
      build: buildVersion
        ? {
            version: buildVersion,
            release: buildRelease,
            builtAt: builtAt ? new Date(builtAt) : undefined,
          }
        : undefined,
      spectator,
      local: !!local,
      host: !!host,
    };

    if (!spectator) {
      const color = toLower(colorOrSpectator) as TeamColor;

      teams[teamName] = {
        player: name,
        name: teamName,
        color,
        cpu: false,
        won:
          teamName === winningTeam ||
          color === winningColor ||
          !!mission?.successful,
        ...teamTimeTotals[teamName]!,
      };
    }
    // @ts-ignore
  }, playerRegex.captureAll(log));

  forEach((capture) => {
    if (!capture) {
      return;
    }

    const { color, name, cpuLevel } = capture;

    teams[name] = {
      name,
      color: toLower(color) as TeamColor,
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

    if (event.type == "alliedChat") {
      const playersTeams = filter(
        ({ player }) => player === event.player,
        values(teams)
      );
      event.color =
        playersTeams.length === 1 ? head(playersTeams)?.color : undefined;
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
  } else if (originalFilename.includes("[Training]")) {
    type = "training";
  } else if (originalFilename.includes("[Quick CPU]")) {
    type = "quick";
  } else if (originalFilename.includes("[Deathmatch]")) {
    type = "deathmatch";
  }

  return {
    build,
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

const capitalize = replace(/^./, toUpper);

export function replayFilename(game: WAGame): string {
  const startedAt = format(game.startedAt, "yyyy-MM-dd HH.mm.ss");
  const playerList = join(
    ", ",
    map(
      (player) => (player.local ? `@` : "") + player.name,
      values(game.players)
    )
  );
  const teamList = join(", ", map(prop("name"), values(game.teams)));

  const typeStr = game.type
    ? ` [${capitalize(game.type)}${
        game.type === "mission" ? ` #${game.mission?.number}` : ""
      }]`
    : "";

  return `${startedAt} [WADB]${typeStr} ${playerList || teamList}.WAgame`;
}
