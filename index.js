const express = require('express')
const cors = require('cors')
require('dotenv').config()
const {initDriver} = require('./neodb/connect');
const app = express()
var bodyParser = require('body-parser')
const port = 3200

initDriver(process.env.neo4j_URL,process.env.neo4j_username, process.env.neo4j_password)


app.use(cors({origin: '*'}))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.get('/', (req, res)=>{
    res.json({message: 'Welcome'})
})

app.use('/recommend', require('./routes/recommend'))
app.use('/payment', require('./routes/payment-journey'))

app.listen(port, ()=>{
    console.log("Listening ot port 3200")
})