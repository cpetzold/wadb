import { NextApiRequest, NextApiResponse } from "next";

import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import fs from "fs";
import multer from "multer";
import nc from "next-connect";
import { parseGameLog } from "../../../lib/wa";

const db = new PrismaClient();

const handler = nc<NextApiRequest, NextApiResponse>();

const upload = multer({ dest: "uploads" });

handler.post(upload.single("replay"), async (req, res) => {
  const replay = req.file;

  if (!replay) {
    throw new Error("Missing replay");
  }

  // const md5 = await hasha.fromFile(replay.path);

  // const foundGame = await db.game.findFirst({ where: { md5 } });

  // if (foundGame) {
  //   return res.json(foundGame);
  // }

  exec(
    `wine "C:\WA\WA-3.8.1.7.exe" /quiet /getlog "$(winepath -w "${replay.path}")"`
  );

  const logPath = replay.path.replace(/\.wagame/gi, ".log");

  const log = fs.readFileSync(logPath, "utf-8");
  res.json(parseGameLog(log));
});

export default handler;
