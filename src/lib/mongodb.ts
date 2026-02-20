import { Db, MongoClient } from "mongodb";

import { requireEnv } from "@/lib/env";

declare global {
  var __mongoClient: MongoClient | undefined;
}

export async function getDb(): Promise<Db> {
  const uri = requireEnv("mongodbUri");
  const dbName = requireEnv("mongodbDbName");

  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(uri);
    await global.__mongoClient.connect();
  }

  return global.__mongoClient.db(dbName);
}
