const {getDriver} = require('../neodb/connect')

const { int,isInt, isDate, isDateTime, isTime, isLocalDateTime, isLocalTime, isDuration } = require('neo4j-driver')

const driver = getDriver();

const toNativeTypes = (properties) => {
    return Object.fromEntries(Object.keys(properties).map((key) => {
      let value = valueToNativeType(properties[key])
  
      return [ key, value ]
    }))
  }

  const valueToNativeType = (value) => {
    if ( Array.isArray(value) ) {
      value = value.map(innerValue => valueToNativeType(innerValue))
    }
    else if ( isInt(value) ) {
      value = value.toNumber()
    }
    else if (
      isDate(value) ||
      isDateTime(value) ||
      isTime(value) ||
      isLocalDateTime(value) ||
      isLocalTime(value) ||
      isDuration(value)
    ) {
      value = value.toString()
    }
    else if (typeof value === 'object' && value !== undefined  && value !== null) {
      value = toNativeTypes(value)
    }
  
    return value
  }


const initiateTransaction = async(req, res)=>{
    let {user, product} = req.body;
    console.log(user, product)

    const session = driver.session();
    try{
        const checkVerify = await session.writeTransaction(tx=> tx.run(`
        MATCH (user:TestUser {name: $user})
        MATCH (transaction:Transaction {name:$product})
        MATCH (user)-[r1:VERIFIED]->(transaction)
        DELETE r1
        `,{user, product}))

        const checkConfirm = await session.writeTransaction(tx=> tx.run(`
        MATCH (user:TestUser {name: $user})
        MATCH (transaction:Transaction {name:$product})
        MATCH (user)-[r1:CONFIRMED]->(transaction)
        DELETE r1
        `,{user, product}))


        if(checkVerify && checkConfirm){
            const response = await session.writeTransaction(tx=> tx.run(`
            MATCH (user:TestUser {name: $user})
            MATCH (transaction:Transaction {name:$product})
            MERGE (user)-[r1:INITIATED]->(transaction)
            RETURN transaction
            `,{user, product}))
    
            let data = response.records.map(row => toNativeTypes(row.get('transaction').properties));
            console.log(data)
            res.json({product: data, status:"initated"})
        }
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close();
    }
}


const verifyTransaction = async(req, res)=>{
    let user = req.body.user
    let product = req.body.product

    const session = driver.session();
    try{
        const response = await session.writeTransaction(tx=> tx.run(`
        MATCH (user:TestUser {name: $user})
        MATCH (transaction:Transaction {name:$product})
        WHERE EXISTS {(user)-[:INITIATED]->(transaction)}
        MERGE (user)-[r1:VERIFIED]->(transaction)
        RETURN transaction
        `,{user, product}))

        let data = response.records.map(row => toNativeTypes(row.get('transaction').properties));
        console.log(data)
        res.json({product: data, status:"verifed"})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close();
    }
}


const confirmTransaction = async(req, res)=>{
    let {user, product} = req.body;
    const session = driver.session();
    try{
        const response = await session.writeTransaction(tx=> tx.run(`
        MATCH (user:TestUser {name: $user})
        MATCH (transaction:Transaction {name:$product})
        WHERE EXISTS {(user)-[:INITIATED]->(transaction)} AND EXISTS {(user)-[:VERIFIED]->(transaction)}
        MERGE (user)-[r1:CONFIRMED]->(transaction)
        RETURN transaction
        `,{user, product}))

        let data = response.records.map(row => toNativeTypes(row.get('transaction').properties));
        console.log(data)
        res.json({product: data, status:"confirm"})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close();
    }
}

const getProduct = async(req, res)=>{
    const session = driver.session()

    try{
        const response = await session.readTransaction(txn => txn.run(
            `MATCH (t:Transaction)
            RETURN t.name as Product`
        ))
        let data = response.records.map(row => row.get('Product'));
        res.json({message: data})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close()
    }
}

const getRecommendation = async(req, res)=>{
    let {user} = req.body;
    console.log(user)
    const session = driver.session()

    try{
        const response = await session.readTransaction(txn => txn.run(
            `MATCH (user:TestUser {name: $user})-[r:INITIATED]-(transaction:Transaction)
            WHERE NOT EXISTS {(user)-[r2:VERIFIED]->(transaction)} OR NOT EXISTS {(user)-[r3:CONFIRMED]->(transaction)}
            RETURN transaction.name AS Product`
        , {user: user}))
        let data = response.records.map(row => row.get('Product'));
        console.log(data)
        res.json({recommend: data})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close()
    }
}


module.exports = {
    initiateTransaction,
    verifyTransaction,
    confirmTransaction,
    getProduct,
    getRecommendation
}