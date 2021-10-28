import { Document, Filter, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import * as db from "../../../lib/db";

const handler = nc<NextApiRequest, NextApiResponse>();

handler.get(async (req, res) => {
  const games = await db.collection("games");
  const gameId = req.query.gameId as string;
  const conditions: Filter<Document>[] = [{ filename: gameId }];
  if (ObjectId.isValid(gameId)) {
    conditions.push({ _id: new ObjectId(gameId) });
  }
  const result = await games.findOne({ $or: conditions });
  res.json(result);
});

export default handler;
