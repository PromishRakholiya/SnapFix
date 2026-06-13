const { MongoClient } = require("mongoose").mongo;

const LOCAL_URI = "mongodb://localhost:27017/snapfix";
const REMOTE_URI =
  "mongodb+srv://DeepVegad:143@cluster0.q8fenbd.mongodb.net/snapfix?appName=Cluster0";

async function transfer() {
  console.log("Connecting to databases...");
  const localClient = new MongoClient(LOCAL_URI);
  const remoteClient = new MongoClient(REMOTE_URI);

  try {
    await localClient.connect();
    console.log("Connected to local DB.");
    await remoteClient.connect();
    console.log("Connected to remote DB.");

    const localDb = localClient.db();
    const remoteDb = remoteClient.db();

    const collections = await localDb.listCollections().toArray();

    for (const c of collections) {
      const colName = c.name;
      const documents = await localDb.collection(colName).find({}).toArray();

      if (documents.length > 0) {
        process.stdout.write(
          `Transferring ${documents.length} documents in ${colName}... `,
        );
        // Clear target collection before transferring to prevent duplicate key errors
        await remoteDb.collection(colName).deleteMany({});
        await remoteDb.collection(colName).insertMany(documents);
        console.log("Done.");
      } else {
        console.log(`Skipped ${colName} (empty).`);
      }
    }
    console.log("All collections transferred successfully.");
  } catch (err) {
    console.error("Error during transfer:", err.message);
  } finally {
    await localClient.close();
    await remoteClient.close();
  }
}

transfer();
