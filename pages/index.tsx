import { Box, Button, Flex, Foo, Frame, Heading, Table } from "wa-ui";

import Head from "next/head";
import type { NextPage } from "next";
import { useDropzone } from "react-dropzone";

const Home: NextPage = () => {
  const { acceptedFiles, fileRejections, getRootProps, getInputProps, open } =
    useDropzone({
      accept: ".wagame",
      noClick: true,
    });

  console.log({ acceptedFiles, fileRejections });

  return (
    <Box {...getRootProps({ className: "dropzone" })}>
      <Head>
        <title>WADB</title>
      </Head>
      <input {...getInputProps()} />

      <Flex
        sx={{
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Flex
          sx={{
            flexDirection: "column",
            width: "100%",
            maxWidth: 1280,
            padding: "large",
            gap: "large",
          }}
        >
          <Flex sx={{ justifyContent: "center" }}>
            <Heading size="large">WADB</Heading>
          </Flex>

          <Frame title="Recent Uploads">
            <Table
              sx={{
                width: "100%",
                border: "2px solid",
                borderColor: "border",
                borderCollapse: "collapse",
                "& thead": {
                  backgroundColor: "black",
                  borderBottom: "2px solid",
                  borderColor: "border",
                  color: "border",
                },
                "& th, & td": {
                  fontWeight: "normal",
                  textAlign: "left",
                  padding: "small",
                },
                "& th:not(:last-child)": {
                  borderRight: "2px solid",
                  borderColor: "border",
                },
              }}
            >
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    2021-10-27 20.54.39 [Online Round 3] @dt-Mablak, Sycotropic,
                    Dieego98.WAgame
                  </td>
                  <td>2021-11-03</td>
                  <td></td>
                </tr>
              </tbody>
            </Table>
          </Frame>

          <Flex sx={{ justifyContent: "end" }}>
            <Button sx={{ width: "50%", height: 80 }} onClick={() => open()}>
              Upload replays...
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Home;
