import { PrismaClient, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

import nc from "next-connect";

const db = new PrismaClient();

const handler = nc<NextApiRequest, NextApiResponse>();

handler.get(async (req, res) => {
  const md5 = req.query.md5 as string;

  const game = await db.game.findUnique({ where: { md5 } });

  if (!game) {
    res.status(404);
    return res.send("Game not found");
  }

  res.json({
    md5: game.md5,
    uploadedAt: game.uploadedAt,
    filename: game.filename,
    ...(game.data as Prisma.JsonObject),
  });
});

export default handler;
