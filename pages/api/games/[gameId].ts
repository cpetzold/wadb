import { NextApiRequest, NextApiResponse } from "next";

import nc from "next-connect";

const handler = nc<NextApiRequest, NextApiResponse>();

handler.get(async (req, res) => {
  res.send(200);
});

export default handler;
