const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = 7000;

app.use(cors());
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require("mongodb");


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
    const purchaseCollection =database.collection("purchase")


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

app.get('/api/artWorks', async(req , res) => {
  const cursor = artWorksCollection.find();
  const result = await cursor.toArray()
  res.send(result)
})

    app.post("/api/artWorks", async (req, res) => {
      try {
        const artWork = req.body;
        const newArtWork = {
          ...artWork,
          createdAt:new Date()
        }
        const result = await artWorksCollection.insertOne(newArtWork);

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

app.get("/api/artistProfile", async (req, res) => {
  const query = {};

  if (req.query.userId) {
    query.userId = req.query.userId;
  }

  const result = await artistProfileCollection
    .findOne(query)

  res.send(result);
});

app.post("/api/artistProfile", async (req, res) => {
try {
  const artistProfile = req.body;
  const newArtistProfile ={
    ...artistProfile,
    createdAt: new Date()
  }
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

// artwork id

app.get("/api/artWorks/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const artwork = await artWorksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found",
      });
    }

    res.json(artwork);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Invalid ID or server error",
    });
  }
});


  //PURCHASE ARTS 
  app.post('/api/purchase', async(req , res) => {
    const purchase = req.body;
    const newPurchase = {
      ...purchase,
      createdAt: new Date()
    }
    const result = await purchaseCollection.insertOne(newPurchase)
    res.send(result)
  })


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