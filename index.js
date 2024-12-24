require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

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
    app.get('/featured', async (req, res) => {
      try {
        console.log('GET /featured endpoint hit');
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        console.log('Limit:', limit);


        const sortBy = req.query.sortBy;

       
        let result;
        if (limit) {
          result = await foodCollection 
            .find({ foodStatus: "available" }) // Filter by food status
            .sort({ foodQuantity: -1 }) // Sort by food quantity in descending order
            .limit(limit) // Limit the number of results
            .toArray();
        } else {
          let sortOptions = {};
          if (sortBy === 'expireDate') {
            sortOptions = { expireDate: 1 }; // Sort by expireDate in descending order
          }
          result = await foodCollection.find().sort(sortOptions).toArray();
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

  app.get('/transfer/:id', async(req,res)=>{
     const id=req.params.id;
     const query={_id: new ObjectId(id)};
     const food=await foodCollection.findOne(query);
  
     const result=await requestedFoodCollection.insertOne(food);
     const deleted=await foodCollection.deleteOne(query);
    res.send({
      insertedId:result,
      deletedCount:deleted,
    })
  
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
