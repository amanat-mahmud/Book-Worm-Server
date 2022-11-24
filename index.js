const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()

// middle ware
app.use(cors())
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kd8d4hj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});

async function run(){
    try{}
    catch{}
    finally{}
}
run().catch(err=>console.error(err.message))

app.get('/',(req,res)=>{
    res.send('Server Running');
})
app.listen(port,(req,res)=>{
    console.log(`Running on ${port}`);
})