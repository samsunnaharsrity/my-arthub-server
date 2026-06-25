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
    const purchaseCollection =database.collection("purchase");
    const plansCollection =database.collection("plans");
    const usersCollection = database.collection("user")
    const subscriptionCollection = database.collection('subscription');
    const commentsCollection = database.collection('comments');

// user collection

app.post("/api/users", async (req, res) => {
  try {
    const userData = req.body;
    
    
    const existingUser = await usersCollection.findOne({
      email: userData.email
    });

    if (existingUser) {

      if (!existingUser.planId) {
        await usersCollection.updateOne(
          { email: userData.email },
          {
            $set: {
              plan: "user_free",
              planId: "user_free",
              updatedAt: new Date()
            }
          }
        );
      }

      return res.send({
        success: true,
        message: "User already exists"
      });
    }

    const newUser = {
      ...userData,
      role: "user",
      planId: "user_free",
      plan: "user_free",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


app.get("/api/users", async (req, res) => {
  const { email } = req.query;

  const user = await usersCollection.findOne({
    email: email?.trim().toLowerCase()
  });

  if (!user) return res.send(null);

  return res.send({
    ...user,
    role: user.role || "user",
    plan: user.plan || "user_free",
    planId: user.planId || "user_free",
  });
});

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

// app.get('/api/artWorks', async(req , res) => {
//   const cursor = artWorksCollection.find();
//   const result = await cursor.toArray()
//   res.send(result)
// })

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
  const result = await artistProfileCollection.insertOne(newArtistProfile);

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

app.get("/api/purchase", async (req, res) => {
  try {
    const { buyerId, page = 1, limit = 6 } = req.query;

    const query = {};
    if (buyerId) query.buyerId = buyerId;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await purchaseCollection.countDocuments(query);

    const items = await purchaseCollection
      .find(query)
      .sort({ createdAt: -1 })  
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    res.send({
      items,
      total,
    
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


  app.post("/api/purchase", async (req, res) => {
  const purchaseData = req.body;

  const newPurchaseData = {
    ...purchaseData,
    createdAt: new Date()
  }

  const result = await purchaseCollection.insertOne(
    newPurchaseData
  );

  res.send({
    insertedId: result.insertedId,
    success: true,
  });
});


// pricing plan

app.get("/api/plans", async (req, res) => {
  try {
    const { plan_id } = req.query;

    console.log("Requested plan_id:", plan_id);

    if (!plan_id) {
      return res.status(400).send({
        success: false,
        message: "plan_id is required",
      });
    }

    const plan = await plansCollection.findOne({
      _id: plan_id.trim(),
    });

    console.log("Found plan:", plan);

    if (!plan) {
      return res.status(404).send({
        success: false,
        message: "Plan not found",
      });
    }

    res.send(plan);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

// subscription info
app.post('/api/subscriptions', async (req, res) => {
  try {
    const data = req.body;
    console.log("Received Subscription Data:", data);

    const finalPlan = data.plan || data.planId;

    if (!data.email || !finalPlan) {
      return res.status(400).send({ 
        success: false, 
        message: "Email and Plan are required" 
      });
    }

    await subscriptionCollection.insertOne({
      email: data.email,
      planId: finalPlan, 
      createdAt: new Date()
    });

    const updateResult = await usersCollection.updateOne(
      { email: data.email },
      {
        $set: {
          planId: finalPlan, 
          updatedAt: new Date()
        }
      }
    );

    console.log("User Plan Update Result:", updateResult);

    res.send({
      success: true,
      message: "Subscription created and User plan updated successfully!"
    });

  } catch (error) {
    console.error("Subscription Error:", error);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});


// comments

app.get("/api/comments", async (req, res) => {
  try {
    const { artworkId } = req.query;

    if (!artworkId) {
      return res.status(400).send({
        success: false,
        message: "artworkId required",
      });
    }

    const comments = await commentsCollection
      .find({ artworkId: String(artworkId) })
      .sort({ createdAt: -1 })
      .toArray();

    const map = {};
    const roots = [];

    comments.forEach((c) => {
      c.replies = [];
      map[c._id.toString()] = c;
    });

    comments.forEach((c) => {
      if (c.parentId) {
        map[c.parentId]?.replies.push(c);
      } else {
        roots.push(c);
      }
    });

    res.send(roots);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


app.post("/api/comments", async (req, res) => {
  try {
    const {
      artworkId,
      text,
      userId,
      userName,
      userAvatar,
      parentId = null,
    } = req.body;

    if (!artworkId || !text) {
      return res.status(400).send({
        success: false,
        message: "artworkId and text required",
      });
    }

const newComment = {
  artworkId: String(artworkId),
  text,
  userId,
  userName: userName || "Anonymous",
  userAvatar: userAvatar || "",
  parentId: parentId ? String(parentId) : null,
  likes: [],
  createdAt: new Date(),
};

    const result = await commentsCollection.insertOne(newComment);

    res.send({
      success: true,
      comment: { ...newComment, _id: result.insertedId },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/comments/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const comments = await commentsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      total: comments.length,
      items: comments
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

// LIKE UPDATE

app.post("/api/comments/like", async (req, res) => {
  try {
    const { commentId, userId } = req.body;

    if (!commentId || !userId) {
      return res.status(400).send({ success: false, message: "commentId and userId required" });
    }

    const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return res.status(404).send({ success: false, message: "Comment not found" });
    }
    const isLiked = comment.likes?.includes(userId);
    const updateDoc = isLiked 
      ? { $pull: { likes: userId } } 
      : { $addToSet: { likes: userId } };

    await commentsCollection.updateOne({ _id: new ObjectId(commentId) }, updateDoc);
    const updatedComment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });

    res.send({ success: true, likes: updatedComment.likes });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});


app.get("/api/users", async (req, res) => {
  const { email } = req.query;

  const user = await usersCollection.findOne({
    email: email?.trim().toLowerCase()
  });

  res.send(user);
});

app.get("/api/users/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const user = await usersCollection.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }

    res.send(user);

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});


// DELETE BTN FROM ARTIST ARTWORK

app.delete("/api/artWorks/:id", async (req, res) => {
  const id = req.params.id;

  const result = await artWorksCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});


// EDIT ARTWORK DATA
app.patch("/api/artWorks/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;

  console.log("ID:", id);
  console.log("BODY:", body);

  const result = await artWorksCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: body,
    }
  );

  res.send(result);
});

// APPROVE REJECT AND DELETE

app.patch("/api/artWorks/approve/:id", async (req, res) => {
  const id = req.params.id;

  const result = await artWorksCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "approved",
      },
    }
  );

  res.send(result);
});


app.patch("/api/artWorks/reject/:id", async (req, res) => {
  const id = req.params.id;

  const result = await artWorksCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "rejected",
      },
    }
  );

  res.send(result);
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