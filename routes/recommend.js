let router = require('express').Router();
let {saveIntraction, getRecommendation, getUser, targetedUser} = require('../controller/recommend')

router.post('/list', (req, res)=>{
    getRecommendation(req, res)
})

router.post('/', (req, res)=>{
    saveIntraction(req, res)
})
router.get('/user', (req, res)=>{
    getUser(req, res)
})

router.post('/target-user', (req, res)=>{
    targetedUser(req, res)
})

module.exports = router;