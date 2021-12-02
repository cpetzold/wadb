import { forEach, join, map, split, values } from "ramda";

import { TypedRegEx } from "typed-regex";
import { format } from "date-fns";

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
  player: string;
  name: string;
  color: string;
  turnCount: number;
  turnTime: number;
  retreatTime: number;
  won: boolean;
};

type BaseEvent = {
  timestamp: number;
  player: string;
};

type ChatEvent = BaseEvent & {
  type: "chat";
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

type Event =
  | ChatEvent
  | StartTurnEvent
  | EndTurnEvent
  | FireWeaponEvent
  | DamageEvent;

type WAGame = {
  id: string;
  buildVersion: string;
  engineVersion: string;
  fileFormatVersion: string;
  exportedWithVersion: string;

  startedAt: Date;
  matchComplete: boolean;
  round: number;
  roundTime?: number;
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

const roundRegex = TypedRegEx("^End of round (?<round>\\d+)$", "gm");
const roundTimeRegex = TypedRegEx("^Round time: (?<roundTime>.*)$", "gm");

const winnerRegex = TypedRegEx(
  "^(?<teamName>.*) wins the (?<gameType>(match|round))(!|\\.)$",
  "gm"
);

const playerRegex = TypedRegEx(
  '^(?<colorOrSpectator>Red|Green|Blue|Yellow|Magenta|Cyan|Spectator):\\s+"(?<name>[^"]+)"(\\s+as)?\\s+("(?<teamName>[^"]+)")*.*\\(addr: (?<addr>[^\\)]+)\\)\\s+\\(lang: (?<lang>[^\\)]+)\\)\\s+\\(build: (?<build>.*\\])\\)\\s*(?<local>\\[Local Player\\])?\\s*(?<host>\\[Host\\])?$',
  "gm"
);

const eventRegex = TypedRegEx("^\\[\\d{2}:\\d{2}:\\d{2}\\.\\d{2}\\].*$", "gm");

const chatEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] \\[(?<playerName>[^\\]]+)\\] (?<message>.*)$",
  "gm"
);

const startTurnEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ��� (?<teamName>.*) \\((?<playerName>[^\\)]+)\\) starts turn$",
  "gm"
);

const endTurnEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ��� (?<teamName>.*) \\((?<playerName>[^\\)]+)\\) ends turn; time used: (?<turnTime>[\\d\\.]+) sec turn, (?<retreatTime>[\\d\\.]+) sec retreat$",
  "gm"
);

const fireWeaponEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ��� (?<teamName>.*) \\((?<playerName>[^\\)]+)\\) fires (?<weapon>.*)$",
  "gm"
);

const damageEventRegex = TypedRegEx(
  "^\\[(?<timestamp>[^\\]]+)\\] ��� Damage dealt: (?<damages>.*)$",
  "gm"
);

const damageRegex = TypedRegEx(
  "^(?<amount>\\d+)( \\((?<kills>\\d+) kills?\\))? to (?<teamName>.*) \\((?<playerName>[^\\)]+)\\)$",
  "gm"
);

function parseDamage(damageStr: string): Damage {
  const damage = damageRegex.captures(damageStr);

  if (!damage) {
    throw new Error("Failed to parse damage");
  }

  return {
    amount: parseInt(damage.amount),
    kills: parseInt(damage.kills),
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
      player: startTurnEvent.playerName,
      team: startTurnEvent.teamName,
    } as StartTurnEvent;
  }

  const endTurnEvent = endTurnEventRegex.captures(event);
  if (endTurnEvent) {
    return {
      type: "endTurn",
      timestamp: parseTimestamp(endTurnEvent.timestamp),
      player: endTurnEvent.playerName,
      team: endTurnEvent.teamName,
      turnTime: parseFloat(endTurnEvent.turnTime) * 1000,
      retreatTime: parseFloat(endTurnEvent.retreatTime) * 1000,
    } as EndTurnEvent;
  }

  const fireWeaponEvent = fireWeaponEventRegex.captures(event);
  if (fireWeaponEvent) {
    return {
      type: "fireWeapon",
      timestamp: parseTimestamp(fireWeaponEvent.timestamp),
      player: fireWeaponEvent.playerName,
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

  return undefined;
}

export function parseGameLog(log: string): WAGame {
  const buildVersion = buildVersionRegex.captures(log)!.buildVersion;
  const id = idRegex.captures(log)!.id;
  const startedAt = startedAtRegex.captures(log)!.startedAt;
  const engineVersion = engineVersionRegex.captures(log)!.engineVersion;
  const fileFormatVersion =
    fileFormatVersionRegex.captures(log)!.fileFormatVersion;
  const exportedWithVersion =
    exportedWithVersionRegex.captures(log)!.exportedWithVersion;
  const round = parseInt(roundRegex.captures(log)!.round);
  const roundTime = parseTimestamp(roundTimeRegex.captures(log)!.roundTime);

  // TODO: Don't make this required
  const winnerCaptures = winnerRegex.captures(log);
  if (!winnerCaptures) {
    throw new Error("Failed to parse");
  }

  const winningTeam = winnerCaptures.teamName;
  const matchComplete = winnerCaptures.gameType === "match";

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
        retreatTime: 0,
        turnCount: 0,
        turnTime: 0,
        won: teamName === winningTeam,
      };
    }
  }, playerRegex.captureAll(log));

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

    events.push(event);
  }

  return {
    buildVersion,
    engineVersion,
    exportedWithVersion,
    fileFormatVersion,
    id,
    startedAt: new Date(startedAt),
    round,
    roundTime,
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
