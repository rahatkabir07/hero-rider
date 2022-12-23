const express = require("express");
const { MongoClient } = require('mongodb');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const app = express();
const stripe = require('stripe')('sk_test_51Jw5T5E4flQuO7rVFuy5gHjjePYJUpWyY6fnviz9ptD3hkfyXNREVg9w3tqO7atkEGJruMRwtOIiRL9pYfEFxiwR00baf99d5u');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cidqo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        console.log("server connected");
        const database = client.db('heroRider');
        const usersCollection = database.collection('users');
        const servicesCollection = database.collection('services');
        const ordersCollection = database.collection('orders');

        //get addProducts
        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/selectedservice/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await servicesCollection.findOne(query);
            res.send(service);
        })

        //post/confirm/place that selected order
        app.post('/bookNow', async (req, res) => {
            const orderDetails = req.body;
            const result = await ordersCollection.insertOne(orderDetails);
            res.send(result);
        })


        //---------------------Authentication-----------------------
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user);

        })
        //getting users info to differnciate admin and user
        app.get('/savedUsers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.send({ admin: isAdmin });

        })

        //send users to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', async (req, res) => {
            const cursor = usersCollection.find({});
            const users = await cursor.toArray();
            res.send(users);
        })



        //Admin Panel
        // get all users in admin panel

        app.get('/allUser', async (req, res) => {
            let { page, size } = req.query;
            if (!page) {
                page = 1
            }
            if (!size) {
                size = 4
            }
            const count = await usersCollection.find({}).count();
            const limit = parseInt(size)
            const skip = page * size;
            const result = await usersCollection.find({}, { limit: limit, skip: skip }).toArray();
            res.send({
                count,
                result
            });
        })

        // find specific user to update
        app.get("/allUser/:id", async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.findOne({ _id: ObjectId(id) });
            res.send(result);
        });
        // status update
        app.put("/allUser/:id", async (req, res) => {
            const id = req.params.id;
            const updateStatus = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: updateStatus.status,
                },
            };
            const result = await usersCollection.updateOne(
                filter,
                updateDoc,
            );
            res.send(result);
        });

        // get Learner
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email: email });
            res.send(result);
        })




        //Payment

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await servicesCollection.findOne(query);
            res.send(result);
        })
        app.post('/services', async (req, res) => {
            const services = req.body;
            const result = await servicesCollection.insertOne(services);
            res.send(result);
        })

        app.put('/services/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await servicesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.post('/create-checkout-session', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })

        })

    }

    finally {
        // await client.close()
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Task Server Is Running")
})

app.listen(port, () => {
    console.log("Task Server Is Running at Port", port);
})