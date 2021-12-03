import cp from "child_process";
import fs from "fs-extra";
import hasha from "hasha";
import multer from "multer";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import util from "util";
import { parseGameLog, replayFilename } from "../../../lib/wa";

import iconv from "iconv-lite";
import { map } from "ramda";

const exec = util.promisify(cp.exec);

const db = new PrismaClient();

const handler = nc<NextApiRequest, NextApiResponse>();

var upload = multer({ dest: "/tmp/wadb" });

handler.post(upload.single("replay"), async (req, res) => {
  const replay = req.file;

  if (!replay) {
    throw new Error("Missing replay");
  }

  const md5 = await hasha.fromFile(replay.path, { algorithm: "md5" });

  const foundGame = await db.game.findFirst({ where: { md5 } });

  if (foundGame) {
    return res.json({
      md5: foundGame.md5,
      filename: foundGame.filename,
      uploadedAt: foundGame.uploadedAt,
      ...(foundGame.data as Prisma.JsonObject),
    });
  }

  const waInstanceDir = `/home/conner/wa-instances/${md5}`;
  await fs.copy("/home/conner/wa-instances/template", waInstanceDir);
  await exec(
    `wine "C:\\wa-instances\\${md5}\\WA.exe" /quiet /getlog "$(winepath -w '${replay.path}')"`
  );

  const logPath = replay.path + ".log";
  const log = iconv.decode(await fs.readFile(logPath), "win1251");
  const gameData = parseGameLog(log, replay.originalname);

  const filename = replayFilename(gameData);

  const game = await db.game.create({
    data: {
      md5,
      filename,
      uploadedAt: new Date(),
      data: gameData as object,
      replay: await fs.readFile(replay.path),
    },
  });

  fs.remove(replay.path);
  fs.remove(logPath);
  fs.remove(waInstanceDir);

  res.json({
    md5: game.md5,
    filename: game.filename,
    uploadedAt: game.uploadedAt,
    ...(game.data as Prisma.JsonObject),
  });
});

handler.get(async (req, res) => {
  const recentGames = await db.game.findMany({
    select: {
      filename: true,
      md5: true,
      uploadedAt: true,
    },
    orderBy: { uploadedAt: "desc" },
  });

  res.json(
    map((game) => {
      return {
        md5: game.md5,
        filename: game.filename,
        replay: `https://wadb.wormsranking.com/api/replays/${game.filename}`,
        details: `https://wadb.wormsranking.com/api/games/${game.md5}`,
        uploadedAt: game.uploadedAt,
      };
    }, recentGames)
  );
});

export default handler;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
