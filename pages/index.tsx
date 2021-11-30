import {
  Box,
  Button,
  Container,
  Divider,
  HStack,
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";

import Head from "next/head";
import Image from "next/image";
import type { NextPage } from "next";
import React from "react";
import icon from "../public/wadb-icon.png";
import { useDropzone } from "react-dropzone";

export default function Home() {
  const { acceptedFiles, fileRejections, getRootProps, getInputProps, open } =
    useDropzone({
      accept: ".wagame",
      noClick: true,
    });

  console.log({ acceptedFiles, fileRejections });

  return (
    <Container
      sx={{
        maxW: "container.xl",
        padding: 5,
      }}
      {...getRootProps({ className: "dropzone" })}
    >
      <Head>
        <title>WADB</title>
      </Head>
      <input {...getInputProps()} />

      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Image
            src={icon}
            width={48}
            height={(icon.width / icon.height) * 48}
          />
          <Button colorScheme="blue" onClick={() => open()}>
            Upload replays...
          </Button>
        </HStack>

        <Heading size="md">Recent replays</Heading>
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Uploaded</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>
                2021-10-27 20.54.39 [Online Round 3] @dt-Mablak, Sycotropic,
                Dieego98.WAgame
              </Td>
              <Td>2021-11-03</Td>
              <Td></Td>
            </Tr>
          </Tbody>
        </Table>
      </VStack>
    </Container>
  );
}
