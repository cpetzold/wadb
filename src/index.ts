require("dotenv").config();

import { Storage } from "@google-cloud/storage";
import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import FormData from "form-data";
import fs from "fs";
import { Filter, MongoClient, ObjectId } from "mongodb";
import fetch from "node-fetch";
import path from "path";
import { omit } from "ramda";

// @ts-ignore
import MongoPaging from "mongo-cursor-pagination";

const client = new MongoClient(process.env.MONGO_URI);

const gcloudCredentials =
  process.env.GCLOUD_CREDENTIALS &&
  JSON.parse(Buffer.from(process.env.GCLOUD_CREDENTIALS, "base64").toString());

const storage = new Storage({
  projectId: "wormsleague",
  credentials: gcloudCredentials,
});
const bucket = storage.bucket("wadb.wormsleague.com");

const waaasUrl = "https://waaas.zemke.io";

const app = express();
const port = process.env.PORT || 8080;

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

async function downloadFile(url: string, path: string) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

app.post("/games", async (req, res) => {
  const games = client.db("wadb").collection("games");
  const replay = req.files.replay as UploadedFile;
  const foundGame = await games.findOne({ md5: replay.md5 });

  if (foundGame) {
    return res.send(foundGame);
  }

  const form = new FormData();
  form.append("replay", fs.createReadStream(replay.tempFilePath), {
    filename: replay.name,
  });

  const fetchRes = await fetch(waaasUrl, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  const game = await fetchRes.json();

  const mapFilename = path.basename(replay.name, ".WAgame") + ".map.png";
  const mapTmpFile = path.join("/tmp", mapFilename);

  await downloadFile(path.join(waaasUrl, game.map), mapTmpFile);

  const [uploadedMap] = await bucket.upload(mapTmpFile, {
    destination: mapFilename,
    gzip: true,
  });

  const [uploadedReplay] = await bucket.upload(replay.tempFilePath, {
    destination: replay.name,
    gzip: true,
  });

  const gameDocument = {
    md5: replay.md5,
    filename: replay.name,
    mapUrl: uploadedMap.publicUrl(),
    replayUrl: uploadedReplay.publicUrl(),
    ...omit(["map"], game),
  };

  const insertedGame = await games.insertOne(gameDocument);

  res.json({
    _id: insertedGame.insertedId,
    ...gameDocument,
  });
});

app.get("/games", async (req, res, next) => {
  try {
    const result: any = await MongoPaging.findWithReq(
      req,
      client.db("wadb").collection("games"),
      {
        limit: 50,
      }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get("/games/:filenameOrId", async (req, res) => {
  const filenameOrId = req.params.filenameOrId;
  const conditions: Filter<Document>[] = [{ filename: filenameOrId }];
  if (ObjectId.isValid(filenameOrId)) {
    conditions.push({ _id: new ObjectId(filenameOrId) });
  }

  const result = await client.db("wadb").collection("games").findOne({
    $or: conditions,
  });

  res.json(result);
});

client.connect(async (err) => {
  app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
  });
});

process.on("beforeExit", () => client.close());
