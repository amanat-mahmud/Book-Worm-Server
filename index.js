const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
// middle ware
app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kd8d4hj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    const userCollection = client.db('bookWorm').collection('users');
    const bookCollection = client.db('bookWorm').collection('books');
    try{
        app.post("/user",async (req,res)=>{
            const user = req.body;
            const email = req.body.email;
            const existingUser = await userCollection.findOne({email:email});
            if(existingUser)
            {
                return res.status(200);
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })
        app.get('/user', async (req,res)=>{
            const email = req.query.email;
            console.log("seller email",email);
            let query = {}
            if(email){
                query = {email:email}
                const result = await userCollection.findOne(query);
            res.send(result);
            }
            else{
                res.send(null)
            }
            
        })
        app.get('/users', async (req,res)=>{
            const role = req.query.role;
            const query = {role:role}
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, 
                process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });
        app.post("/book", async (req,res)=>{
            const book = req.body;
            const result = await bookCollection.insertOne(book);
            //const test = await userCollection.findOne({email:book.sellerEmail})
            res.send(result);
        })
        app.get('/myproducts',async(req,res)=>{
            const email = req.query.email;
            const result = await bookCollection.find({sellerEmail:email}).toArray();
            res.send(result);
        })
        app.get('/mybuyers',async(req,res)=>{
            const email = req.query.email;
            let result = [] ;
            const myProducts = await bookCollection.find({sellerEmail:email}).toArray();
            // res.send(myProducts)
            const users = await userCollection.find().toArray()
            // myProducts.forEach(async (product)=>{
            //     // console.log(product.buyerEmail);
            //     let test = await userCollection.findOne(
            //     {email:product.buyerEmail})
            //     // console.log(test);
            //     result = [...result,test]
            //     // console.log("Inside",result);
            //     // res.send(result)
            // })
            myProducts.forEach((product)=>{
                users.forEach(user=>{
                    if(product.buyerEmail===user.email){
                        result = [...result,user]
                    }
                })
            })
            console.log(result);
            res.send(result);   
        })
        app.put('/verify',async(req,res)=>{
            const email = req.query.email;
            const filter = {email:email}
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verified: 'yes'
                }
            }
            const user = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(user);
        })
        app.delete('/user',async (req,res)=>{
            const email = req.query.email;
            const result = await userCollection.deleteOne({email:email});
            const test = await bookCollection.deleteMany({sellerEmail:email});
            res.send(result);
        })
        app.get('/books', async(req,res)=>{
            res.send(await bookCollection.find().toArray());
        })
}
    
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