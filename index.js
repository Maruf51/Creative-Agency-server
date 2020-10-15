const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs-extra')
const fileUpload = require('express-fileupload')
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const querystring = require('querystring');
require('dotenv').config();



const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('service'))
app.use(fileUpload())

app.get('/', (req, res) => {
    res.send('everything is ok')
})

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.zfkd7.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// service collection
client.connect(err => {
  const serviceCollection = client.db(process.env.DB_NAME).collection(process.env.DB_SERVICE_COLLECTION);
  
  // for getting service for homepage
  app.get('/getServices', (req, res) => {
    serviceCollection.find({})
    .toArray( (err, documents) => {
        res.send(documents)
    })
  })

  // for getting service that user want to order and we can put image in database
  app.get('/service/:id', (req, res) => {
    serviceCollection.find({_id: ObjectId(req.params.id)})
    .toArray( (err, documents) => {
        res.send(documents[0])
      })
    })

  // for adding any new service in the database by the admin
  app.post('/add-service', (req, res) => {
    const image = req.files.image;
    const title = req.body.title;
    const description = req.body.description;
    const filePath = `${__dirname}/service/${image.name}`
    image.mv(filePath, err => {
      if(err){
        console.log(err)
        res.status(500).send({msg: 'Failed to save image to database'})
      }
      const newImage = fs.readFileSync(filePath)
      const encImage = newImage.toString('base64')

      var image = {
        contentType: req.files.image.mimetype,
        size: req.files.image.size,
        img: Buffer.from(encImage, 'base64')
      }

      serviceCollection.insertOne({title, description, image})
      .then(result => {
        fs.remove(filePath, error => {
          if(error){
            console.log(error)
          }
          res.send(result.insertedCount > 0)
        })
      })
    })
    console.log(title, description, image)
  })
});


// review collection
client.connect(err => {
  const reviewsCollection = client.db(process.env.DB_NAME).collection(process.env.DB_REVIEWS_COLLECTION);
  
  // for getting all review for the homepage
  app.get('/getReviews', (req, res) => {
    reviewsCollection.find({})
    .toArray( (err, documents) => {
        res.send(documents)
    })
  })

  // for adding any new review by the user
  app.post('/addReview', (req, res) => {
    const data = req.body
    reviewsCollection.insertOne(data)
    .then(result => {
      res.send(result)
    })
    .catch(err => console.log(err))
  })
});


// order collection
client.connect(err => {
  const orderCollection = client.db(process.env.DB_NAME).collection(process.env.DB_ORDER_COLLECTION);
  
  // for adding any order by the user
  app.post('/addOrder', (req, res) => {
    const data = req.body
    orderCollection.insertOne(data)
    .then(result => {
      res.send(result)
    })
    .catch(err => console.log(err))
  })

  // for getting any specific order for the specific user
  app.get('/getUserOrder/', (req, res) => {
    orderCollection.find({email: req.query.email})
    .toArray( (err, documents) => {
      res.send(documents)
    } )
  })

  // for getting all order for the admin
  app.get('/get-all-ordered-service', (req, res) => {
    orderCollection.find({})
    .toArray( (err, documents) => {
        res.send(documents)
    })
  })
});


// admin collection
client.connect(err => {
  const adminCollection = client.db(process.env.DB_NAME).collection(process.env.DB_ADMIN_COLLECTION);
  
  // for checking any email that is admin or not
  app.get('/get-admin/', (req, res) => {
    adminCollection.find({email: req.query.email})
    .toArray( (err, documents) => {
      if(documents.length > 0){
        res.send(true)
      }
      else{
        res.send(false)
      }
    } )
  })

  // for adding a new admin by the admin
  app.post('/add-admin', (req, res) => {
    const email = req.body
    adminCollection.insertOne(email)
    .then(result => {
      res.send(result)
    })
    .catch(err => console.log(err))
  })
});




app.listen(process.env.PORT || 5000)