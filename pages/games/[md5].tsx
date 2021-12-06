import {
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Checkbox,
  CheckboxGroup,
  Heading,
  HStack,
  Link,
  StackDivider,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useCheckboxGroup,
  VStack,
} from "@chakra-ui/react";
import { PrismaClient } from "@prisma/client";
import { format, formatRelative } from "date-fns";
import { GetServerSidePropsContext } from "next";
import { TypeScriptConfig } from "next/dist/server/config-shared";
import dynamic from "next/dynamic";
import Image from "next/image";
import NextLink from "next/link";
import {
  ascend,
  filter,
  flatten,
  isEmpty,
  isNil,
  keys,
  map,
  omit,
  prop,
  replace,
  sortWith,
  toUpper,
  values,
} from "ramda";
import React, { useEffect, useState } from "react";
import Page from "../../components/Page";
import { formatOrdinal, formatTimestamp } from "../../lib/format";

import missions from "../../lib/missions";

import cpu1 from "../../public/cpu1.png";
import cpu2 from "../../public/cpu2.png";
import cpu3 from "../../public/cpu3.png";
import cpu4 from "../../public/cpu4.png";
import cpu5 from "../../public/cpu5.png";
import human from "../../public/human.png";
import victory from "../../public/victory.png";

const ReactJson = dynamic(import("react-json-view"), { ssr: false });

const db = new PrismaClient();

const cpuImages = [cpu1, cpu2, cpu3, cpu4, cpu5];

const teamColors = {
  red: "red.200",
  blue: "blue.200",
  green: "green.200",
  yellow: "yellow.200",
  cyan: "cyan.200",
  magenta: "purple.200",
};

function GameHeader({ game }) {
  switch (game.type) {
    case "online":
      return <>Online Game</>;
    case "deathmatch":
      return <>Deathmatch Game (todo: show which DM round here)</>;
    case "training":
      return <>Training</>;
    case "mission":
      return (
        <>
          Mission {game.mission.number}: {game.mission.name}
        </>
      );
    case "quick":
      return <>Quick CPU Game</>;
  }
  return <>Game</>;
}

function Teams({ teams, showPlayers }) {
  const sortedTeams = sortWith([ascend(prop("cpu"))], values(teams));

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Team</Th>
          {showPlayers && <Th>Player</Th>}
          <Th>Won</Th>
          <Th>Turn Count</Th>
          <Th>Turn Time</Th>
          <Th>Retreat Time</Th>
          <Th>Round Time</Th>
        </Tr>
      </Thead>
      <Tbody>
        {sortedTeams.map((team) => (
          <Tr key={team.name}>
            <Td>
              <HStack>
                <Image
                  width={24}
                  height={24}
                  src={
                    team.cpu ? cpuImages[Math.ceil(team.cpuLevel) - 1] : human
                  }
                />
                <Text
                  sx={{
                    fontWeight: "bold",
                    color: teamColors[team.color],
                  }}
                >
                  {team.name}
                </Text>
              </HStack>
            </Td>
            {showPlayers && (
              <Td>
                <Text>{team.player}</Text>
              </Td>
            )}
            <Td>
              {team.won && (
                <Image
                  width={32}
                  height={(victory.height / victory.width) * 32}
                  src={victory}
                />
              )}
            </Td>
            <Td>{team.turnCount}</Td>
            <Td>{!isNil(team.turnTime) && formatTimestamp(team.turnTime)}</Td>
            <Td>
              {!isNil(team.retreatTime) && formatTimestamp(team.retreatTime)}
            </Td>
            <Td>{!isNil(team.totalTime) && formatTimestamp(team.totalTime)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function Players({ players }) {
  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Player</Th>
          <Th>Language</Th>
          {/* <Th>Build Version</Th>
          <Th>Build Release</Th>
          <Th>Built At</Th> */}
        </Tr>
      </Thead>
      <Tbody>
        {values(players).map((player) => (
          <Tr key={player.name}>
            <Td>
              <HStack spacing={2}>
                <Text fontWeight="bold">{player.name}</Text>
                {player.host && <Badge>host</Badge>}
                {player.local && <Badge>local</Badge>}
                {player.spectator && <Badge>spectator</Badge>}
              </HStack>
            </Td>
            <Td>{player.lang}</Td>
            {/* <Td>{player.build?.version}</Td>
            <Td>{player.build?.release}</Td>
            <Td>
              {player.build?.builtAt &&
                format(new Date(player.build.builtAt), "yyyy-MM-dd")}
            </Td> */}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function ChatEvent({ event }) {
  return (
    <Text>
      <strong>[{event.player}]</strong> {event.message}
    </Text>
  );
}

function AlliedChatEvent({ event }) {
  return (
    <Text
      sx={{
        color: event.color ? teamColors[event.color] : "inherit",
      }}
    >
      <strong>
        {`<<`}
        {event.player}
        {`>>`}
      </strong>{" "}
      {event.message}
    </Text>
  );
}

function PrivateChatEvent({ event }) {
  return (
    <Text
      sx={{
        color: "purple.300",
      }}
    >
      <strong>
        [{event.player}..{event.recipient}]
      </strong>{" "}
      {event.message}
    </Text>
  );
}

function StartTurnEvent({ event, teams }) {
  const team = teams[event.team];
  return (
    <Text color="gray.300">
      •••{" "}
      <Text as="strong" color={teamColors[team.color]}>
        {team.name}
      </Text>{" "}
      {team.player && (
        <Text as="span" color="gray.500">
          ({team.player}){" "}
        </Text>
      )}
      starts {formatOrdinal(event.turn)} turn{" "}
      <Text as="span" color="gray.600">
        ({formatOrdinal(event.globalTurn)} game turn)
      </Text>
    </Text>
  );
}

function EndTurnEvent({ event, teams }) {
  const team = teams[event.team];
  return (
    <Text color="gray.300">
      •••{" "}
      <Text as="strong" color={teamColors[team.color]}>
        {team.name}
      </Text>{" "}
      {team.player && (
        <Text as="span" color="gray.500">
          ({team.player}){" "}
        </Text>
      )}
      {event.lostControl ? "loses turn due to loss of control" : "ends turn"}{" "}
      <Text as="span" color="gray.600">
        (Turn time: {formatTimestamp(event.turnTime)} Retreat time:{" "}
        {formatTimestamp(event.retreatTime)})
      </Text>
    </Text>
  );
}

function WeaponEvent({ event, teams }) {
  const team = teams[event.team];
  return (
    <Text color="gray.300">
      •••{" "}
      <Text as="strong" color={teamColors[team.color]}>
        {team.name}
      </Text>{" "}
      {team.player && (
        <Text as="span" color="gray.500">
          ({team.player}){" "}
        </Text>
      )}
      {event.type === "fireWeapon" ? "fires" : "uses"} {event.weapon}
    </Text>
  );
}

function DamageEvent({ event, teams }) {
  const team = teams[event.team];
  return (
    <Text color="gray.300">
      •••{" "}
      <Text as="strong" color={teamColors[team.color]}>
        {team.name}
      </Text>{" "}
      {team.player && (
        <Text as="span" color="gray.500">
          ({team.player}){" "}
        </Text>
      )}
      deals damage:{" "}
      {event.damages.map((damage, i) => {
        const receivingTeam = teams[damage.toTeam];
        return [
          i > 0 && ", ",
          <Text key={i} as="span">
            {damage.amount}{" "}
            {damage.kills > 0 &&
              `(${damage.kills} kill${damage.kills > 1 ? "s" : ""})`}{" "}
            to{" "}
            <Text as="span" color={teamColors[receivingTeam.color]}>
              {receivingTeam.name}
            </Text>{" "}
            {receivingTeam.player && (
              <Text as="span" color="gray.500">
                ({receivingTeam.player}){" "}
              </Text>
            )}
          </Text>,
        ];
      })}
    </Text>
  );
}

function GameEndEvent({ event }) {
  return (
    <Text color="gray.300">
      Game ends{" "}
      <Text as="span" color="gray.600">
        ({event.reason === "altF4" ? "User quit with Alt+F4" : "Round finished"}
        )
      </Text>
    </Text>
  );
}

function NetworkEvent({ event }) {
  return (
    <Text color="gray.300">
      ***{" "}
      <Text as="span" color="gray.600">
        {event.message}
      </Text>
    </Text>
  );
}

function SuddenDeathEvent() {
  return <Text color="gray.300">••• Sudden death</Text>;
}

function Event({ event, game }) {
  switch (event.type) {
    case "chat":
      return <ChatEvent event={event} />;
    case "alliedChat":
      return <AlliedChatEvent event={event} />;
    case "privateChat":
      return <PrivateChatEvent event={event} />;
    case "startTurn":
      return <StartTurnEvent event={event} teams={game.teams} />;
    case "endTurn":
      return <EndTurnEvent event={event} teams={game.teams} />;
    case "fireWeapon":
    case "useWeapon":
      return <WeaponEvent event={event} teams={game.teams} />;
    case "damage":
      return <DamageEvent event={event} teams={game.teams} />;
    case "suddenDeath":
      return <SuddenDeathEvent />;
    case "gameEnd":
      return <GameEndEvent event={event} />;
    case "network":
      return <NetworkEvent event={event} />;
  }

  return null;
}

const eventFilters = {
  Chat: ["chat", "alliedChat", "privateChat"],
  "Turn Start/End": ["startTurn", "endTurn"],
  "Weapon Use/Fire": ["fireWeapon", "useWeapon"],
  Damage: ["damage"],
  Other: ["suddenDeath", "gameEnd", "network"],
};

const eventFilterKeys = keys(eventFilters);

function EventLog({ game }) {
  const [selectedEventFilters, setSelectedEventFilters] =
    useState(eventFilterKeys);
  const selectedEventTypes = flatten(
    map((evFilter) => eventFilters[evFilter], selectedEventFilters)
  );
  const events: any[] = filter(
    ({ type }) => selectedEventTypes.includes(type),
    game.events
  );

  return (
    <VStack align="stretch" spacing={2}>
      <CheckboxGroup
        value={selectedEventFilters}
        onChange={(selectedFilters) =>
          setSelectedEventFilters(selectedFilters as typeof eventFilterKeys)
        }
      >
        <HStack spacing={4}>
          {eventFilterKeys.map((evFilter) => (
            <Checkbox colorScheme="pink" key={evFilter} value={evFilter}>
              {evFilter}
            </Checkbox>
          ))}
        </HStack>
      </CheckboxGroup>
      <VStack align="stretch" spacing={0.5} color="gray.200">
        {events.map((event, i) => (
          <HStack key={`${event.type}-${event.timestamp}-${i}`}>
            <Box>
              <a id={event.timestamp} />
              <NextLink href={`#${event.timestamp}`}>
                <Link color="gray.600">
                  [{formatTimestamp(event.timestamp)}]
                </Link>
              </NextLink>
            </Box>
            <Event event={event} game={game} />
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}

function Game({ game }) {
  const now = new Date();
  return (
    <VStack align="stretch" spacing={6}>
      <HStack align="center" spacing={4}>
        {game.mission && (
          <Image
            src={missions[game.mission.number - 1].image!}
            width={64}
            height={64}
          />
        )}
        <Box>
          <Heading>
            <GameHeader game={game} />
          </Heading>
          <Text fontSize="sm" color="gray.400">
            Played {formatRelative(new Date(game.startedAt), now)} &middot;
            Uploaded {formatRelative(new Date(game.uploadedAt), now)}
          </Text>
        </Box>
        <Button
          as="a"
          href={`/api/replays/${game.filename}`}
          download={game.filename}
        >
          Download Replay
        </Button>
      </HStack>

      <HStack
        flexWrap="wrap"
        align="start"
        spacing={5}
        marginTop={5}
        divider={<StackDivider borderColor="gray.700" />}
      >
        {game.round && (
          <Stat>
            <StatLabel>Round</StatLabel>
            <StatNumber>{game.round}</StatNumber>
          </Stat>
        )}
        {game.roundTime && (
          <Stat>
            <StatLabel>Round Time</StatLabel>
            <StatNumber>{formatTimestamp(game.roundTime)}</StatNumber>
          </Stat>
        )}
        {game.mission && (
          <Stat>
            <StatLabel>Mission Outcome</StatLabel>
            <StatNumber
              color={game.mission.successful ? "green.200" : "red.200"}
            >
              {game.mission.successful ? "Success" : "Failed"}
            </StatNumber>
          </Stat>
        )}
        {game.engineVersion && (
          <Stat>
            <StatLabel>Engine Version</StatLabel>
            <StatNumber>{game.engineVersion}</StatNumber>
          </Stat>
        )}
        {/* {game.build?.version && (
          <Stat>
            <StatLabel>Build Version</StatLabel>
            <StatNumber>{game.build.version}</StatNumber>
          </Stat>
        )}
        {game.build?.release && (
          <Stat>
            <StatLabel>Build Release</StatLabel>
            <StatNumber>{game.build.release}</StatNumber>
          </Stat>
        )}
        {game.build?.builtAt && (
          <Stat>
            <StatLabel>Built At</StatLabel>
            <StatNumber>
              {format(new Date(game.build.builtAt), "yyyy-MM-dd")}
            </StatNumber>
          </Stat>
        )} */}
      </HStack>

      <Box>
        <Heading size="md" marginBottom={2}>
          Teams
        </Heading>
        <Teams teams={game.teams} showPlayers={!isEmpty(game.players)} />
      </Box>

      {!isEmpty(game.players) && (
        <Box>
          <Heading size="md" marginBottom={2}>
            Players
          </Heading>
          <Players players={game.players} />
        </Box>
      )}

      <Box>
        <Heading size="md" marginBottom={2}>
          Log
        </Heading>
        <EventLog game={game} />
      </Box>
    </VStack>
  );
}

export default function GamePage({ game }) {
  useEffect(() => {
    console.log(game);
  }, []);

  return (
    <Page key={game.md5}>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbItem>
          <BreadcrumbLink href="/games">Games</BreadcrumbLink>
        </BreadcrumbItem>

        {game && (
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href={`/games/${game.md5}`}>
              {game.filename}
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}
      </Breadcrumb>

      {game ? <Game game={game} /> : <Box>Game not found</Box>}
    </Page>
  );
}

export async function getServerSideProps({ query }: GetServerSidePropsContext) {
  const md5 = query.md5 as string;

  const game = await db.game.findUnique({ where: { md5 } });
  const dataObj = game?.data as any;

  const data = game
    ? {
        ...omit(["build"], dataObj),
        players: map(omit(["build"]), dataObj.players),
      }
    : {};

  return {
    props: {
      game: game
        ? {
            ...data,
            md5: game.md5,
            filename: game.filename,
            originalFilename: game.originalFilename,
            uploadedAt: game.uploadedAt.toISOString(),
          }
        : null,
    },
  };
}
