import hasha from "hasha";
// @ts-ignore
import MongoPaging from "mongo-cursor-pagination";
import multer from "multer";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import path from "path";
import { omit } from "ramda";
import * as db from "../../../lib/db";
import { downloadFile } from "../../../lib/fs";
import { bucket } from "../../../lib/gcloud";
import * as waaaas from "../../../lib/waaaas";

const handler = nc<NextApiRequest, NextApiResponse>();

const upload = multer({ dest: "/tmp/" });

handler.post(upload.single("replay"), async (req, res) => {
  const games = await db.collection("games");
  const replay = req.file;
  const replayMd5 = await hasha.fromFile(replay.path);

  const foundGame = await games.findOne({ md5: replayMd5 });

  if (foundGame) {
    return res.send(foundGame);
  }

  const game = await waaaas.parseReplay(replay.path, replay.originalname);

  const mapFilename =
    path.basename(replay.originalname, ".WAgame") + ".map.png";
  const mapTmpFile = path.join("/tmp", mapFilename);

  await downloadFile(game.map, mapTmpFile);

  const [uploadedMap] = await bucket.upload(mapTmpFile, {
    destination: mapFilename,
    gzip: true,
  });

  const [uploadedReplay] = await bucket.upload(replay.path, {
    destination: replay.originalname,
    gzip: true,
  });

  const gameDocument = {
    md5: replayMd5,
    filename: replay.originalname,
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

handler.get(async (req, res, next) => {
  const games = await db.collection("games");
  try {
    const result: any = await MongoPaging.findWithReq(req, games, {
      limit: 50,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default handler;
