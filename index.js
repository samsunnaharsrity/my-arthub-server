const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = 7000;

app.use(cors());
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');


app.get('/', (req, res) => {
  res.send('Hello World!');
});

// mongodb



const uri = process.env.MONGODB_URI;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const database = client.db("arthub");
    const artWorksCollection = database.collection("artWorks");
    const artistProfileCollection = database.collection("artistProfile");


    // artWorks
app.get("/api/artWorks", async (req, res) => {
  const status = req.query.status;

  const query = {};

  if (status) {
    query.status = status;
  }

  const result = await artWorksCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  res.json(result);
});

    app.post("/api/artWorks", async (req, res) => {
      try {
        const artWork = req.body;

        const result = await artWorksCollection.insertOne(artWork);

        res.status(201).json({
          success: true,
          insertedId: result.insertedId,
          message: "Artwork created successfully",
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


    // artist profile
        app.post("/api/artistProfile", async (req, res) => {
      try {
        const artistProfile = req.body;

        const result = await artistProfileCollection.insertOne(artistProfile);

        res.status(201).json({
          success: true,
          insertedId: result.insertedId,
          message: "Artist Profile Created successfully",
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


    await client.db("admin").command({ ping: 1 });

    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error);
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});