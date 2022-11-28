const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
// middle ware
app.use(cors())
app.use(express.json());
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kd8d4hj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run(){
    const userCollection = client.db('bookWorm').collection('users');
    const bookCollection = client.db('bookWorm').collection('books');
    const orderCollection = client.db('bookWorm').collection('orders');
    const paymentCollection = client.db('bookWorm').collection('payments');
    const reportedBookCollection = client.db('bookWorm').collection('reportedBooks');
    try{
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);
        
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
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
            res.send(result);
        })
        app.get('/myproducts',verifyJWT, async(req,res)=>{
            const email = req.query.email;
            const result = await bookCollection.find({sellerEmail:email}).toArray();
            res.send(result);
        })
        app.get('/mybuyers',verifyJWT, async(req,res)=>{
            const email = req.query.email;
            let result = [] ;
            const myProducts = await bookCollection.find({sellerEmail:email}).toArray();
            const users = await userCollection.find().toArray();
            myProducts.forEach((product)=>{
                users.forEach(user=>{
                    if(product.buyerEmail===user.email){
                        result = [...result,user]
                    }
                })
            })
            res.send(result);   
        })
        app.put('/verify',verifyJWT, verifyAdmin, async(req,res)=>{
            const email = req.query.verify;
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
        app.delete('/user',verifyJWT,verifyAdmin,  async (req,res)=>{
            const email = req.query.delete;
            const result = await userCollection.deleteOne({email:email});
            const test = await bookCollection.deleteMany({sellerEmail:email});
            res.send(result);
        })
        app.get('/books', async(req,res)=>{
            res.send(await bookCollection.find().toArray());
        })
        app.put('/books/:id', async(req,res)=>{
            const id = req.params.id;
            const query ={_id:ObjectId(id)}
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertised: "yes",
                }
            }
            res.send(await bookCollection.updateOne(query,updatedDoc,options));
        })
        app.get('/category/:name', async(req,res)=>{
            const name = req.params.name;
            console.log(name);
            res.send(await bookCollection.find({category:name}).toArray());
        })
        app.post('/order', async(req,res)=>{
            const order = req.body;
            console.log(order);
            res.send(await orderCollection.insertOne(order));
        })
        app.get('/order',verifyJWT, async(req,res)=>{
            const email = req.query.email;
            const result =await orderCollection.find({buyerEmail:email}).toArray();
            res.send(result)
        })
        app.get('/order/:id', async(req,res)=>{
            const id = req.params.id;
            const result =await orderCollection.findOne({_id:ObjectId(id)});
            res.send(result)
        })
        app.get('/book',async(req,res)=>{
            const email = req.query.email;
            const result =await bookCollection.find({buyerEmail:email}).toArray();
            res.send(result)
        })
        app.post('/create-payment-intent',verifyJWT, async (req, res) => {
            const booking = req.body;
            const price = booking.product_price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        app.put('/payments',verifyJWT, async (req, res) =>{
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            await orderCollection.deleteMany({product_id:payment.product_id ,sellerEmail:payment.sellerEmail})
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    buyerEmail: payment.buyerEmail,
                    available: "no"
                }
            }
            await bookCollection.updateOne({_id:ObjectId(payment.product_id)},updatedDoc,options) 
            res.send(result);
        })
        app.post('/report',verifyJWT, async(req,res)=>{
            const reportedBy = req.body.userEmail;
            const reportedBook = req.body.book;
            const sellerEmail = reportedBook.sellerEmail
            const bookImage = reportedBook.bookImage
            const bookName = reportedBook.bookName
            const price = reportedBook.reSalePrice;
            // console.log(reportedBy, reportedBook);
            const result = await reportedBookCollection.insertOne({reportedBy,sellerEmail,bookImage,bookName,price})
            res.send(result)
        })
        app.get('/report',verifyJWT, async(req,res)=>{
            const result = await reportedBookCollection.find().toArray()
            res.send(result)
        })
        app.delete('/report',verifyJWT, verifyAdmin, async(req,res)=>{
            const id = req.query.id;
            console.log(id);
            const result = await reportedBookCollection.deleteOne({_id:ObjectId(id)});
            res.send(result)
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