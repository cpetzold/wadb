import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Heading,
  HStack,
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
  VStack,
} from "@chakra-ui/react";
import { PrismaClient } from "@prisma/client";
import { format, formatRelative } from "date-fns";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import prettyMilliseconds from "pretty-ms";
import { isEmpty, replace, toUpper, values } from "ramda";
import React from "react";
import Page from "../../components/Page";

import cpu1 from "../../public/cpu1.png";
import cpu2 from "../../public/cpu2.png";
import cpu3 from "../../public/cpu3.png";
import cpu4 from "../../public/cpu4.png";
import cpu5 from "../../public/cpu5.png";
import human from "../../public/human.png";
import victory from "../../public/victory.png";

const pm = (ms: number) => prettyMilliseconds(ms, { colonNotation: true });

const ReactJson = dynamic(import("react-json-view"), { ssr: false });

const db = new PrismaClient();

const cpuImages = [cpu1, cpu2, cpu3, cpu4, cpu5];

const capitalize = replace(/^./, toUpper);

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

function Teams({ teams }) {
  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Team</Th>
          <Th>Player</Th>
          <Th>Won</Th>
          <Th>Turn Count</Th>
          <Th>Turn Time</Th>
          <Th>Retreat Time</Th>
          <Th>Total Time</Th>
        </Tr>
      </Thead>
      <Tbody>
        {values(teams).map((team) => (
          <Tr key={team.name}>
            <Td>
              <Box
                sx={{
                  display: "inline-block",
                  backgroundColor: "gray.900",
                  paddingX: 1.5,
                  paddingY: 1,
                  borderRadius: "sm",
                  fontWeight: "bold",
                  color: teamColors[team.color],
                }}
              >
                {team.name}
              </Box>
            </Td>
            <Td>
              <HStack>
                <Image
                  width={24}
                  height={24}
                  src={
                    team.cpu ? cpuImages[Math.ceil(team.cpuLevel) - 1] : human
                  }
                />
                <Text>{team.player}</Text>
              </HStack>
            </Td>
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
            <Td>{team.turnTime && pm(team.turnTime)}</Td>
            <Td>{team.retreatTime && pm(team.retreatTime)}</Td>
            <Td>{team.totalTime && pm(team.totalTime)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function Game({ game }) {
  const now = new Date();
  return (
    <Box>
      <Heading>
        <GameHeader game={game} />
      </Heading>
      <Text fontSize="sm" color="gray.700">
        Played {formatRelative(new Date(game.startedAt), now)} &middot; Uploaded{" "}
        {formatRelative(new Date(game.uploadedAt), now)}
      </Text>

      <HStack
        flexWrap="wrap"
        align="start"
        spacing={5}
        marginTop={5}
        divider={<StackDivider borderColor="gray.200" />}
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
            <StatNumber>{pm(game.roundTime)}</StatNumber>
          </Stat>
        )}
        {game.mission && (
          <Stat>
            <StatLabel>Mission Outcome</StatLabel>
            <StatNumber>
              {game.mission.successful ? "Success!" : "Failure :("}
            </StatNumber>
          </Stat>
        )}
        {game.engineVersion && (
          <Stat>
            <StatLabel>Engine Version</StatLabel>
            <StatNumber>{game.engineVersion}</StatNumber>
          </Stat>
        )}
        {game.build?.version && (
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
            <StatLabel>Build Release</StatLabel>
            <StatNumber>
              {format(new Date(game.build.builtAt), "yyyy-MM-dd")}
            </StatNumber>
          </Stat>
        )}
      </HStack>

      <Box marginTop={5}>
        <Heading size="md">Teams</Heading>
        <Teams teams={game.teams} />
      </Box>
    </Box>
  );
}

const teamColors = {
  Red: "red.200",
  Blue: "blue.200",
  Green: "green.200",
  Yellow: "yellow.200",
  Cyan: "cyan.200",
  Magenta: "purple.200",
};

export default function GamePage({ game }) {
  return (
    <Page>
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

      {game ? (
        <>
          <Game game={game} />
          <ReactJson src={game} displayDataTypes={false} name={game.filename} />
        </>
      ) : (
        <Box>Game not found</Box>
      )}
    </Page>
  );
}

export async function getServerSideProps({ query }: GetServerSidePropsContext) {
  const md5 = query.md5 as string;

  const game = await db.game.findUnique({ where: { md5 } });

  return {
    props: {
      game: game
        ? {
            ...(game.data as object),
            filename: game.filename,
            uploadedAt: game.uploadedAt.toISOString(),
          }
        : null,
    }, // will be passed to the page component as props
  };
}
