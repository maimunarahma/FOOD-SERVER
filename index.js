require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 4000;
const cookieParser= require('cookie-parser');
// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

// Log environment variables
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASS:", process.env.DB_PASS);

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n0bjr.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Collection reference


async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    // Root route
    app.get('/', (req, res) => {
      res.send('mysha-panda running');
    });
    const foodCollection = client.db('food-panda-mysha').collection('yummy-food');
    const requestedFoodCollection= client.db('food-panda-mysha').collection('requested-food');
    // API to fetch featured food items
    app.get('/featured/:email?', async (req, res) => {
      const email=req.params.email;
      let query = {};
      if (email) {
        query = { $or: [{ ownerEmail: email }, { ownerEmail: { $exists: false } }] }; 
      }
    
      try {
        console.log('GET /featured endpoint hit');
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        console.log('Limit:', limit);


        const sortBy = req.query.sortBy;

       
        let result;
        if (limit) {
          result = await foodCollection 
            .find(query) // Filter by food status
            .sort({ foodQuantity: -1 }) // Sort by food quantity in descending order
            .limit(limit) // Limit the number of results
            .toArray();
        } else {
          let sortOptions = {};
          if (sortBy === 'expireDate') {
            sortOptions = { expireDate: 1 }; // Sort by expireDate in descending order
          }
          result = await foodCollection.find(query).sort(sortOptions).toArray();
        }
        console.log('Result:', result);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error in GET /featured:", error);
        res.status(500).send({ message: "Failed to fetch featured items" });
      }
    });
app.get('/details/:id', async(req,res)=>{
   
  const id=req.params.id;
  const query={_id: new ObjectId(id)}
  const food= await foodCollection.findOne(query);
  res.send(food)
  
})

app.post('/featured',async(req,res)=>{
  const food= req.body;
  console.log('food',food);
  const result= await foodCollection.insertOne(food);
  res.send(result);
})

 app.post('/myrequests/:email', async (req, res) => {
  const email = req.params.email; // Extract email from route
  const requestData = req.body;  // Extract data from the request body
  const { foodId } = requestData; // Assuming `foodId` is passed in the request

  try {
    // Insert request data into `myrequests` collection
    const newRequest = {
      ...requestData,
      requestedBy: email,
      timestamp: new Date(),
    };

    // Perform simultaneous operations
    const [insertResult, deleteResult] = await Promise.all([
      requestedFoodCollection.insertOne(newRequest), // Insert into `myrequests`
      foodCollection.deleteOne({ _id: new ObjectId(foodId) }), // Delete from `foodCollection`
    ]);

    if (insertResult.insertedId && deleteResult.deletedCount === 1) {
      res.status(200).send({
        success: true,
        message: "Request successfully added and food item removed.",
        requestId: insertResult.insertedId,
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Failed to complete both operations.",
      });
    }
  } catch (error) {
    console.error("Error in /myrequests:", error);
    res.status(500).send({
      success: false,
      message: "Internal server error.",
    });
  }
});


  app.get('/myRequests/:email',async(req,res)=>{
    const email=req.params.email;
    const query={requestedBy:email};

    const result=await requestedFoodCollection.find(query).toArray();
    // console.log('cookie',req.cookie)
    res.send(result);

  })

  //jwt

  app.post('/jwt', async(req,res)=>{
    const user=req.body;
    const token=jwt.sign(user,process.env.JWT_SECRET, {expiresIn:'1h'})
    res.cookie('token',token,{
      httpOnly:true,
      secure:false,
    })
    res.send({success:true});
  })

  // app.get('/update/:id', async(req,res)=>{
  //    const id= req.params.id;
  //    const query={_id: new ObjectId(id)}
  //    const food= await foodCollection.findOne(query)
  //    res.send(food);


  // })
  // app.put('/update/:id', async(req, res)=>{
  //   const id= req.params.id;
  //   const food= req.body;
  //   console.log('update',food);
  //   const filter={_id: new ObjectId(id)}
  //   const optionb={upsert:true}
  //   const updateFood={
  //     $set:{
  //       name:food.foodName,
  //       image:food.foodImg,
  //       price:food.price,
  //       quantity: food.foodQuantity,
  //     location:food.pickupLocation,
  //   expire:food.expireDate,
  // note: food.additionalNotes,
  // status:"available",

  //    }
  //   }
  // })

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Start the server and run the application
app.listen(port, () => {
  console.log(`mysha-panda running on port ${port}`);
});

run().catch(console.dir);
