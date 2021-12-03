import { PrismaClient, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

import nc from "next-connect";

const db = new PrismaClient();

const handler = nc<NextApiRequest, NextApiResponse>();

handler.get(async (req, res) => {
  const filename = req.query.filename as string;

  const game = await db.game.findUnique({ where: { filename } });

  if (!game) {
    res.status(404);
    return res.send("Game not found");
  }

  res.send(game.replay);
});

export default handler;
