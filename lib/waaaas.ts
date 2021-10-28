import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
import path from "path";

const API_URL = "https://waaas.zemke.io";

export async function parseReplay(
  replayFilePath: string,
  replayFileName: string
) {
  const form = new FormData();
  form.append("replay", fs.createReadStream(replayFilePath), {
    filename: replayFileName,
  });

  const fetchRes = await fetch(API_URL, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  const game = await fetchRes.json();

  return { ...game, map: path.join(API_URL, game.map) };
}
