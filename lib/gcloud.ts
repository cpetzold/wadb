import { Storage } from "@google-cloud/storage";

const gcloudCredentials =
  process.env.GCLOUD_CREDENTIALS &&
  JSON.parse(Buffer.from(process.env.GCLOUD_CREDENTIALS, "base64").toString());

const storage = new Storage({
  projectId: "wormsleague",
  credentials: gcloudCredentials,
});

export const bucket = storage.bucket("wadb.wormsleague.com");
