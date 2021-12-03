import {
  Box,
  Button,
  Container,
  HStack,
  Link,
  StackDivider,
  VStack,
} from "@chakra-ui/react";
import Head from "next/head";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React, { forwardRef, useState } from "react";
import { useDropzone } from "react-dropzone";
// @ts-ignore wtf?!
import icon from "../public/wadb-icon.png";

export default function Page({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { getRootProps, getInputProps, open } = useDropzone({
    accept: ".wagame",
    noClick: true,
    maxFiles: 1,
    async onDropAccepted(files) {
      const replay = files[0];
      const formData = new FormData();
      formData.append("replay", replay, replay.name);

      setLoading(true);
      const res = await fetch("/api/games", {
        method: "POST",
        body: formData,
      });

      const game = await res.json();
      router.push(`/games/${game.md5}`);
      setLoading(false);
    },
  });

  return (
    <Container
      sx={{
        maxW: "container.xl",
        padding: 5,
      }}
      {...getRootProps()}
    >
      <Head>
        <title>WADB</title>
      </Head>

      <input {...getInputProps()} />

      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={6}>
            <Image
              src={icon}
              width={48}
              height={(icon.width / icon.height) * 48}
            />
            <HStack
              spacing={4}
              divider={<StackDivider borderColor="gray.300" />}
            >
              <NextLink href="/games">
                <Link>Games</Link>
              </NextLink>
            </HStack>
          </HStack>
          <Button isLoading={loading} colorScheme="blue" onClick={open}>
            Upload Replay
          </Button>
        </HStack>

        {children}
      </VStack>
    </Container>
  );
}
