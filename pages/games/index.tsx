import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { GetServerSidePropsContext } from "next";
import React from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/router";
import Page from "../../components/Page";

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { map, update } from "ramda";
const db = new PrismaClient();

export async function getServerSideProps({ query }: GetServerSidePropsContext) {
  const md5 = query.md5 as string;

  const games = await db.game.findMany({
    orderBy: { uploadedAt: "desc" },
    select: { filename: true, md5: true, data: true, uploadedAt: true },
  });

  return {
    props: {
      games: map(
        (game) => ({ ...game, uploadedAt: game.uploadedAt.toISOString() }),
        games
      ),
    }, // will be passed to the page component as props
  };
}

export default function Home({ games }) {
  return (
    <Page>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="/games">Games</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Uploaded</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {games.map((game) => (
            <Tr key={game.md5}>
              <Td>
                <Link href={`/games/${game.md5}`}>{game.filename}</Link>
              </Td>
              <Td>{game.uploadedAt}</Td>
              <Td></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Page>
  );
}
