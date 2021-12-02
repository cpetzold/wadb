import test from "ava";
import { parseGameLog, WAGame } from "../lib/wa";
import fs from "fs-extra";
import path from "path";
import iconv from "iconv-lite";
import { keys } from "ramda";

function parseGameLogFile(filename: string): WAGame {
  const log = iconv.decode(
    fs.readFileSync(path.resolve(__dirname, "game-logs", filename)),
    "win1251"
  );
  return parseGameLog(log);
}

test("dm-failed.log", (t) => {
  const game = parseGameLogFile("dm-failed.log");
  t.truthy(game);
  t.is(game.type, undefined);
  t.is(game.events.length, 18);
  t.is(game.teams["C Team"]?.won, false);
});

test("dm-success.log", (t) => {
  const game = parseGameLogFile("dm-success.log");
  t.truthy(game);
  t.is(game.type, undefined);
  t.is(game.teams["C Team"]?.won, true);
});

test("mission-failed.log", (t) => {
  const game = parseGameLogFile("mission-failed.log");
  t.truthy(game);
  t.is(game.type, "mission");
  t.is(game.mission?.successful, false);
});

test("mission-success.log", (t) => {
  const game = parseGameLogFile("mission-success.log");
  t.truthy(game);
  t.is(game.type, "mission");
  t.is(game.mission?.successful, true);
});

test("online-multiple-teams-per-player.log", (t) => {
  const game = parseGameLogFile("online-multiple-teams-per-player.log");
  t.truthy(game);
  t.is(game.type, "online");
  t.is(keys(game.players).length, 2);
});

test("quick-cpu.log", (t) => {
  const game = parseGameLogFile("quick-cpu.log");
  t.truthy(game);
  t.is(game.type, undefined);
  t.is(game.events.length, 4);
});

test("training-failed-altf4.log", (t) => {
  const game = parseGameLogFile("training-failed-altf4.log");
  t.truthy(game);
  t.is(game.type, undefined);
  t.is(game.events.length, 6);
});

test("training-failed-turn-loss.log", (t) => {
  const game = parseGameLogFile("training-failed-turn-loss.log");
  t.truthy(game);
  t.is(game.type, undefined);
  t.is(game.events.length, 6);
});
