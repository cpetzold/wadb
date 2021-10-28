import { Collection, CollectionOptions, Document, MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);

export async function getDb() {
  await client.connect();
  return client.db("wadb");
}

export async function collection(
  name: string,
  options?: CollectionOptions
): Promise<Collection<Document>> {
  const db = await getDb();
  return db.collection(name, options);
}
