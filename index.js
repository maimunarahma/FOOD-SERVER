require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 4000;
const cookieParser = require('cookie-parser');
// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
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
    const requestedFoodCollection = client.db('food-panda-mysha').collection('requested-food');
    // API to fetch featured food items
    app.get('/featured', async (req, res) => {
      try {
          const limit = req.query.limit ? parseInt(req.query.limit) : null;
          const sortBy = req.query.sortBy;
          const email = req.body.email ? String(req.body.email) : null;
    console.log(email)

          console.log('Limit:', limit, 'Sort By:', sortBy);
          let query = {}; 
          if(email) query.email = email; // Define query if needed
          let sortOptions = {};
  
          if (sortBy === 'expireDate') {
              sortOptions = { expireDate: 1 }; // Sort by expireDate in ascending order
          }
  
          let result;
          if (limit) {
              result = await foodCollection
                  .find(query) // Apply filtering if needed
                  .sort({ foodQuantity: -1 }) // Sort by food quantity (highest first)
                  .limit(limit)
                  .toArray();
          } else {
              result = await foodCollection.find(query).sort(sortOptions).toArray();
          }
  
          console.log('Result:', result);
          res.status(200).send(result);
      } catch (error) {
          console.error('Error fetching featured food:', error);
          res.status(500).send({ error: 'Internal Server Error' });
      }
  });

  app.get('/featured/:email', async (req, res) => {
    const email = req.params.email;
    const query = { ownerEmail: email };
    const result = await foodCollection.find(query).toArray();
    res.send(result);
  })
  
    app.get('/details/:id', async (req, res) => {

      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const food = await foodCollection.findOne(query);
      res.send(food)

    })
    app.post('/featured/:email', async (req, res) => {
      const { email } = req.params; // Extract email from route parameter
      const { foodName, foodImg, price, foodQuantity,rating, pickupLocation, expireDate, additionalNotes } = req.body;

      if (!email) {
        return res.status(400).send({ message: 'Email is required' });
      }

      const food = {
        foodName,
        foodImg,
        price,
        rating,
        foodQuantity,
        pickupLocation,
        expireDate,
        additionalNotes,
        ownerEmail: email, // Assign the dynamic email to the food item
        status: 'available', // Default status for the food
        createdAt: new Date(), // Optional: Timestamp of when the food is added
      };

      try {
        const result = await foodCollection.insertOne(food);
        res.status(200).send({
          success: true,
          message: 'Food successfully added to the featured list.',
          food: food,
          foodId: result.insertedId,
        });
      } catch (error) {
        console.error('Error inserting food:', error);
        res.status(500).send({
          success: false,
          message: 'Failed to add food to the featured list.',
        });
      }
    });


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


    app.get('/myRequests/:email', async (req, res) => {
      const email = req.params.email;
      const query = { requestedBy: email };

      const result = await requestedFoodCollection.find(query).toArray();
      // console.log('cookie',req.cookie)
      res.send(result);

    })

    //jwt

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
      })
      res.send({ success: true });
    })

    app.get('/update/:id', async (req, res) => {
      console.log(food,"update food")
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const food = await foodCollection.findOne(query)
      res.send(food);


    })
    app.put('/details/:id', async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      console.log(food)
      console.log('update', food);
      const filter = { _id: new ObjectId(id) }
      const options = { upsert:false}
      const updateFood = {
        $set: {
       ...food

        }
      }
      console.log('update', updateFood);
      const result = await foodCollection.findOneAndUpdate( { _id: new ObjectId(id) }, // Find by ID
      { $set:{foodName:food.name, foodQuantity:food.quantity, pickupLocation:food.location, expireDate:food.date} },     // Update fields
      { returnDocument: "after" });
      if (result) {
        res.send({ success: true, message: 'Food updated successfully', result });
    } 
    
    })

    app.delete('/details/:id', async (req, res) => {
      const id = req.params.id;
      console.log('Attempting to delete document with id:', id);

      try {
        const query = { _id: new ObjectId(id) };

        // Check if the document exists
        const document = await foodCollection.findOne(query);
        if (!document) {
          console.log('No document found with id:', id);
          return res.status(404).json({ message: 'Document not found' });
        }

        // Attempt to delete the document
        const result = await foodCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          console.log('Successfully deleted document with id:', id);
          res.status(200).json({ message: 'Document deleted successfully' });
        } else {
          console.log('Failed to delete document with id:', id);
          res.status(500).json({ message: 'Failed to delete document' });
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'An error occurred while deleting the document' });
      }
    });
    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
          httpOnly: true,
          secure: false,
          sameSite: 'strict'
      })
      res.send({ success: true })})


  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Start the server and run the application
app.listen(port, () => {
  console.log(`mysha-panda running on port ${port}`);
});

run().catch(console.dir);
