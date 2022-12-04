let router = require('express').Router();
let {initiateTransaction, verifyTransaction, confirmTransaction, getProduct, getRecommendation} = require('../controller/payment-journey')

router.get('/product', (req, res)=>{
    getProduct(req, res)
})

router.post('/recommend', (req, res)=>{
    getRecommendation(req, res)
})

router.post('/initiate', (req, res)=>{
    initiateTransaction(req, res)
})

router.post('/verify', (req, res)=>{
    verifyTransaction(req, res)
})

router.post('/confirm', (req, res)=>{
    confirmTransaction(req, res)
})

module.exports = router;