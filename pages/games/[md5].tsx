import { GetServerSidePropsContext } from "next";
import React from "react";
import Page from "../../components/Page";

import { PrismaClient } from "@prisma/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  VStack,
} from "@chakra-ui/react";
const db = new PrismaClient();

export default function Game({ game }) {
  return (
    <Page>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbItem>
          <BreadcrumbLink href="/games">Games</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href={`/games/${game.md5}`}>
            {game.filename}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <pre>{JSON.stringify(game, null, 2)}</pre>
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
        : undefined,
    }, // will be passed to the page component as props
  };
}
