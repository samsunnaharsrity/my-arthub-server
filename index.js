const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = 7000;

app.use(
  cors({
    origin: [
      "https://my-arthub.vercel.app",
      "https://your-vercel-app.vercel.app",
    ],
    credentials: true,
  })
);


app.use(express.json()) 

const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require("mongodb");


app.get('/', (req, res) => {
  res.send('Hello World!');
});

const logger = (req , res , next) =>{
  console.log('logger', req.params);
  next();
}



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
    const settingsCollection = database.collection("settings");
    const draftCollection = database.collection("drafts")
    const sessionCollection = database.collection("session")




// TOKEN VERIFICATIONS
const verifyToken = async(req , res, next) =>{

  console.log('headers' , req.headers);
  const authHeader = req.headers?.authorization
  if(!authHeader){
    return res.status(401).send({message: ' unauthorized access'})
  }

  const token = authHeader.split(' ')[1]

  if(!token){
    return res.status(401).send({message: ' unauthorized access'})
  }

const query = {token: token}
const session = await sessionCollection.findOne({
  token,
});

if (!session) {
  return res.status(401).send({
    success: false,
    message: "Invalid token",
  });
}

console.log("SESSION:", session);

const user = await usersCollection.findOne({
  _id: new ObjectId(session.userId),
});

console.log("USER:", user);

if (!user) {
  return res.status(401).send({
    success: false,
    message: "User not found",
  });
}

req.user = user;
next();
}


// VERIFY USERS

const verifyUser = async (req, res, next)=>{

if (req.user?.role !== "user")  {
  return res.status(403).send({
    message: "forbidden access",
  });
}


  next();
}


// VERIFY ADMIN

const verifyAdmin = async (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).send({
      message: "forbidden access",
    });
  }

  next();
};

// VERIFY ARTIST

const verifyArtist = async (req, res, next) => {
  if (req.user?.role !== "artist") {
    return res.status(403).send({
      message: "forbidden access",
    });
  }

  next();
};


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


// app.get("/api/users", async (req, res) => {
//   const { email } = req.query;

//   const user = await usersCollection.findOne({
//     email: email?.trim().toLowerCase()
//   });

//   if (!user) return res.send(null);

//   return res.send({
//     ...user,
//     role: user.role || "user",
//     plan: user.plan || "user_free",
//     planId: user.planId || "user_free",
//   });
// });

    // artWorks
app.get("/api/artWorks", async (req, res) => {
  try {
    const { status, category } = req.query;

    const query = {};

    if (status) query.status = status;

    if (category) {
      query.category = {
        $regex: new RegExp(`^${category}$`, "i"),
      };
    }

    const result = await artWorksCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});



app.get("/api/users",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const user = await usersCollection.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!user) {
        return res.send(null);
      }

      return res.send(user);
    }
    // All users
    const users = await usersCollection.find().toArray();

    res.send(users);

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


// ARTWORKS
app.post("/api/artWorks" ,logger,
  verifyToken,
  verifyArtist, async (req, res) => {
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

    app.get("/api/artWorks/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid artwork id" });
    }

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

app.post("/api/artistProfile",logger,
  verifyToken,
  verifyArtist, async (req, res) => {
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

// all artist profile

app.get("/api/artistProfile/all", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    const skip = (page - 1) * limit;

    const total = await artistProfileCollection.countDocuments();

    const items = await artistProfileCollection
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send({
      items,
      total,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch artists",
    });
  }
});


// artwork id

// app.get("/api/artWorks/:id",verifyToken, async (req, res) => {
//   try {
//     const id = req.params.id;

//     const artwork = await artWorksCollection.findOne({
//       _id: new ObjectId(id),
//     });

//     if (!artwork) {
//       return res.status(404).json({
//         success: false,
//         message: "Artwork not found",
//       });
//     }

//     res.json(artwork);
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Invalid ID or server error",
//     });
//   }
// });

app.get("/api/artWorks/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid artwork id" });
    }

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


  //PURCHASE ARTS 

app.get("/api/purchase", async (req, res) => {
  try {
    const { buyerId, buyerEmail, page = 1, limit = 6 } = req.query;

    const query = {};
    if (buyerEmail) {
      query.buyerEmail = buyerEmail.trim().toLowerCase();
    } else if (buyerId) {
      query.buyerId = buyerId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await purchaseCollection.countDocuments(query);
    const items = await purchaseCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    res.send({ items, total });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});


app.post("/api/purchase",logger,  verifyToken,
  verifyUser, async (req, res) => {
  try {
    console.log("PURCHASE HIT:", req.body);

    const {
      artworkId,
      buyerEmail,
      buyerId,
      title,
      price,
      shipping,
    } = req.body;

    if (!artworkId || !buyerEmail) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    const email = buyerEmail.trim().toLowerCase();

    const alreadyPurchased = await purchaseCollection.findOne({
      artworkId,
      buyerEmail: email,
    });

    if (alreadyPurchased) {
      return res.status(409).send({
        success: false,
        message: "Already purchased",
      });
    }

    const newPurchase = {
      artworkId,
      buyerId,
      buyerEmail: email,
      title,
      price: Number(price),
      shipping,
      createdAt: new Date(),
    };

    const result = await purchaseCollection.insertOne(newPurchase);

    console.log("INSERT RESULT:", result.insertedId); // 🔥 DEBUG

    res.send({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
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
app.post("/api/subscriptions", async (req, res) => {
  try {
    console.log("SUBSCRIPTION HIT:", req.body);

    const { email, plan, planId } = req.body;

    const finalPlan = plan || planId;

    if (!email || !finalPlan) {
      return res.status(400).send({
        success: false,
        message: "Email and plan required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    await subscriptionCollection.insertOne({
      email: cleanEmail,
      planId: finalPlan,
      createdAt: new Date(),
    });

    const updateResult = await usersCollection.updateOne(
      { email: cleanEmail },
      {
        $set: {
          planId: finalPlan,
          plan: finalPlan,
          updatedAt: new Date(),
        },
      }
    );

    console.log("USER UPDATED:", updateResult.modifiedCount);

    res.send({
      success: true,
      message: "Subscription saved + user updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message,
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

// comment delete
app.delete("/api/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await commentsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!comment) {
      return res.status(404).send({
        success: false,
        message: "Comment not found",
      });
    }

    const result = await commentsCollection.deleteMany({
      $or: [
        { _id: new ObjectId(id) }, 
        { parentId: id }, 
      ],
    });

    res.send({
      success: true,
      message: "Comment and replies deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
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

// UPDATE USER

app.patch("/api/users/:id",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          role,
        },
      }
    );
    res.send({
      success: true,
      message: "Role updated successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


// DELETE BTN FROM ARTIST ARTWORK

app.delete("/api/artWorks/:id",logger,
  verifyToken,
  verifyArtist, async (req, res) => {
  const id = req.params.id;

  const result = await artWorksCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});


// EDIT ARTWORK DATA
app.patch("/api/artWorks/:id", logger,
  verifyToken,
  verifyArtist, async (req, res) => {
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

app.patch("/api/artWorks/approve/:id",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
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


app.patch("/api/artWorks/reject/:id",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
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


// SETTINGS

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await settingsCollection.findOne({ type: "site_settings" });

    if (!settings) {
      return res.send({
        siteName: "ArtHub",
        contactEmail: "admin@arthub.com",
        currency: "USD",
        maintenanceMode: false,
        autoApproveArtwork: false,
      });
    }

    res.send({
  siteName: settings.data.siteName,
  contactEmail: settings.data.contactEmail,
  currency: settings.data.currency,
  maintenanceMode: settings.data.maintenanceMode,
  autoApproveArtwork: settings.data.autoApproveArtwork,
});
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const data = req.body;

    const result = await settingsCollection.updateOne(
      { type: "site_settings" },
      {
        $set: {
          type: "site_settings",
          data,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    res.send({
      success: true,
      message: "Settings saved successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


// ADMIN ARTWORKS
app.get("/api/admin/artworks", async (req, res) => {
  const artworks = await artWorksCollection
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  res.send(artworks);
});

app.delete("/api/admin/artworks/:id",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  const result = await artWorksCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.send({
    success: true,
    result,
  });
});

// ANALYTICS DATA
app.get("/api/analytics/categories", async (req, res) => {
  try {
    const result = await artWorksCollection.aggregate([
      {
        $match: {
          category: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: "$category" } } },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const FIXED_CATEGORIES = [
      "Painting",
      "Digital",
      "Photography",
      "Illustration",
      "Sculpture",
      "Abstract",
    ];

    const map = {};
    result.forEach((item) => {
      map[item._id] = item.count;
    });

    const finalData = FIXED_CATEGORIES.map((cat) => ({
      category: cat,
      count: map[cat.toLowerCase()] || 0,
    }));

    res.json(finalData);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// SALES CATEGORY
app.get("/api/analytics/sales", async (req, res) => {
  try {
    const result = await purchaseCollection.aggregate([
      {
        $match: {
          createdAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          totalSales: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalSales: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]).toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});



// transaction data 
app.get("/api/transactions",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [
      // Purchase Collection
      {
        $project: {
          _id: 1,
          type: { $literal: "purchase" },
          email: { $ifNull: ["$buyerEmail", "$userEmail"] },
          amount: { $ifNull: ["$amount", "$price"] },
          planId: { $literal: null },
          createdAt: 1,
        },
      },

      // Subscription Collection
      {
        $unionWith: {
          coll: "subscription",
          pipeline: [
            {
              $project: {
                _id: 1,
                type: { $literal: "subscription" },
                email: "$email",
                amount: { $ifNull: ["$amount", 0] },
                planId: "$planId",
                createdAt: 1,
              },
            },
          ],
        },
      },
    ];

    // Filter
    if (type) {
      pipeline.push({
        $match: { type },
      });
    }

    // Total Count
    const countResult = await purchaseCollection
      .aggregate([...pipeline, { $count: "total" }])
      .toArray();

    const total = countResult[0]?.total || 0;

    // Pagination
    const items = await purchaseCollection
      .aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ])
      .toArray();

    res.send({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      items,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// ADMIN DASHBOARD
app.get("/api/analytics/overview",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  try {
    const totalUsers =
      await usersCollection.countDocuments();

    const totalArtworks =
      await artWorksCollection.countDocuments();

    const totalSales =
      await purchaseCollection.countDocuments();

    const revenueResult =
      await purchaseCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $toDouble: "$price",
              },
            },
          },
        },
      ]).toArray();

    const totalRevenue =
      revenueResult[0]?.totalRevenue || 0;

    res.send({
      totalUsers,
      totalArtworks,
      totalSales,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// ADMIN COMMENTS ID

app.get("/api/admin/comments",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  try {
    const comments = await commentsCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(comments);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// DELETE ADMIN COMMENT
app.delete("/api/admin/comments/:id",logger,
  verifyToken,
  verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting comment:", id);

    const result = await commentsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Comment not found",
      });
    }

    res.send({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// ARTIST HOME DASHBOARD

app.get("/api/artist/home-dashboard", async (req, res) => {
  try {
    const totalArtworks =
      await artWorksCollection.countDocuments();

    const totalUsers =
      await usersCollection.countDocuments({
        role: "user",
      });

    const totalArtists =
      await usersCollection.countDocuments({
        role: "artist",
      });

    const totalPurchases =
      await purchaseCollection.countDocuments();

    res.send({
      success: true,
      data: {
        totalArtworks,
        totalUsers,
        totalArtists,
        totalPurchases,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// DRAFTED DATA
app.post("/api/drafts", async (req, res) => {
  try {
    const favorite = req.body;

    const exists = await draftCollection.findOne({
      userEmail: favorite.userEmail,
      artworkId: favorite.artworkId,
    });

    if (exists) {
      return res.status(409).send({
        success: false,
        message: "Artwork already in favorites",
      });
    }

    favorite.createdAt = new Date();

    const result = await favoriteCollection.insertOne(
      favorite
    );

    res.send({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});



app.get("/api/drafts", async (req, res) => {
  try {
    const email = req.query.email;

    const favorites = await draftCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(favorites);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


app.delete("/api/drafts/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await draftCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/purchase", async (req, res) => {
  const userId = req.query.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 6;

  const skip = (page - 1) * limit;

  const query = { userId };

  const total = await purchaseCollection.countDocuments(query);

  const items = await purchaseCollection
    .find(query)
    .skip(skip)
    .limit(limit)
    .toArray();

  res.send({
    items,
    total,
  });
});

app.get("/api/artist/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const artist = await artistProfileCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    res.json(artist);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// UPDATE USER PROFILE

app.put("/api/user/update", async (req, res) => {
  try {
    const { name, email, image } = req.body;

    console.log("Received email:", email);

    const existingUser = await usersCollection.findOne({
      email: email.trim().toLowerCase(),
    });

    console.log("Existing user:", existingUser);

    if (!existingUser) {
      return res.status(404).send({
        success: false,
        error: "User not found",
      });
    }

    const result = await usersCollection.findOneAndUpdate(
      {
        email: email.trim().toLowerCase(),
      },
      {
        $set: {
          name,
          image,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );

    res.send({
      success: true,
      user: result,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});


app.get("/api/artistProfile", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }

    const profile =
      await artistProfileCollection.findOne({
        email: email.trim().toLowerCase(),
      });

    res.send(profile);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.post(
  "/api/artistProfile",
  logger,
  verifyToken,
  verifyArtist,
  async (req, res) => {
    try {
      const artistProfile = req.body;

      const existingProfile =
        await artistProfileCollection.findOne({
          email: artistProfile.email
            .trim()
            .toLowerCase(),
        });

      let profile;

      // Update profile if already exists
      if (existingProfile) {
        await artistProfileCollection.updateOne(
          {
            email: artistProfile.email
              .trim()
              .toLowerCase(),
          },
          {
            $set: {
              ...artistProfile,
              updatedAt: new Date(),
            },
          }
        );

        profile =
          await artistProfileCollection.findOne({
            email: artistProfile.email
              .trim()
              .toLowerCase(),
          });
      }

      // Create new profile
      else {
        const result =
          await artistProfileCollection.insertOne({
            ...artistProfile,
            email: artistProfile.email
              .trim()
              .toLowerCase(),
            createdAt: new Date(),
          });

        profile =
          await artistProfileCollection.findOne({
            _id: result.insertedId,
          });
      }

      // Update user collection
      await usersCollection.updateOne(
        {
          email: artistProfile.email
            .trim()
            .toLowerCase(),
        },
        {
          $set: {
            name: artistProfile.name,
            image: artistProfile.photo,
            updatedAt: new Date(),
          },
        }
      );

      res.send({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  }
);

app.get("/api/artistProfile", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({ message: "Email required" });
    }

    const profile = await artistProfileCollection.findOne({
      email: email.trim().toLowerCase(),
    });

    res.send(profile || null);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});
app.post("/api/artistProfile", logger, verifyToken, verifyArtist, async (req, res) => {
  try {
    const data = req.body;

    const email = data.email.trim().toLowerCase();

    const existing = await artistProfileCollection.findOne({ email });

    let profile;

    if (existing) {
      await artistProfileCollection.updateOne(
        { email },
        {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await artistProfileCollection.insertOne({
        ...data,
        email,
        createdAt: new Date(),
      });
    }

    profile = await artistProfileCollection.findOne({ email });

    res.send({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
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