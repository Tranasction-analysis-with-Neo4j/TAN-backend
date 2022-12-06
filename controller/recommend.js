const {getDriver} = require('../neodb/connect')

const { int,isInt, isDate, isDateTime, isTime, isLocalDateTime, isLocalTime, isDuration, Transaction } = require('neo4j-driver')

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


const saveIntraction = async(req, res)=>{
    console.log('req.body-->',req.body)
    const session = driver.session();
    try{
        const response = await session.writeTransaction(tx=> tx.run(`
        MATCH (feature:TestFeature {name:$feature})
        MATCH (user:TestUser {name: $user})
        MERGE (user)-[r:USED_FEATURE]->(feature)
        ON CREATE set r.usedCount = 1
        ON MATCH set r.usedCount = r.usedCount + 1
        RETURN r
        `,{user: req.body.user, feature: req.body.feature}))
        let data = response.records.map(row => toNativeTypes(row.get('r').properties));
        console.log('int-saved',data)
        res.json({message: data})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close();
    }
}


const getRecommendation = async(req, res)=>{
    const session = driver.session();
    try{
        let fullMenu = await getAllMenus()
        const response = await session.readTransaction(async tx=> 
            {
                return tx.run(
                `MATCH (user:TestUser {name:$name})-[r:USED_FEATURE]->(feature:TestFeature)-[:BELONGS_TO]->(menu:TestMenu)
                WITH sum(r.usedCount) AS Weight, menu
                ORDER BY Weight DESCENDING
                RETURN menu.name AS menu, Weight
                `, {name:req.body.user})
            })
        let recommendedMenu = new Set(response.records.map(row => {
            return row.get('menu')
        }));
        console.log(recommendedMenu)
        fullMenu.map(menu=>{
            recommendedMenu.add(menu)
        })
        console.log(recommendedMenu)        
        res.json({message: Array.from(recommendedMenu)})
    }
    catch(err){
        res.status(500).json({err})
    }
    finally{
        await session.close();
    }
}

const getUser = async(req, res)=>{
    const session = driver.session()

    try{
        const response = await session.readTransaction(txn => txn.run(
            `MATCH (user:TestUser)
            RETURN user.name as allUser`
        ))
        let data = response.records.map(row => row.get('allUser'));
        console.log("all user", data)
        if(data.length < 1){
            const response = await session.writeTransaction(tx=> tx.run(`
                MERGE (chris:TestUser {name: "Chris"})
                MERGE (dave: TestUser {name: "Dave"})
                MERGE (candice: TestUser {name:"Candice"})
                MERGE (alan: TestUser {name: "Alan"})
                MERGE (moorie: TestUser {name: "Moorie"})
                MERGE (chris)-[:KNOWS]->(dave)
                MERGE (dave)-[:KNOWS]->(alan)
                MERGE (candice)-[:KNOWS]->(dave)
                MERGE (alan)-[:KNOWS]->(candice)
                MERGE (alan)-[:KNOWS]->(moorie)
                MATCH (r:TestUser)
                RETURN r
        `,{}))
        let seedResponse = response.records.map(row => toNativeTypes(row.get('r').properties));
            if(seedResponse){
                console.log("data seeded")
            }
        }
        res.json({message: data})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close()
    }
}

const getAllMenus =  async()=>{
    const session = driver.session();
    try{
        const response = await session.readTransaction(tx=> tx.run(
            `
            MATCH (menu:TestMenu)
            RETURN menu.name AS allMenu
            `,
        ))
        let data = response.records.map(row => row.get('allMenu'));
        if(data.length < 1){
            const response = await session.writeTransaction(tx=> tx.run(`
            MERGE (loadWallet:TestMenu {name: "Load To Wallet"})
            MERGE (statement: TestMenu {name: "A/C Statements"})
            MERGE (payment: TestMenu {name: "Payment"})
            MERGE (transfer: TestMenu {name:"Transfer"})

            MERGE (imepay: TestFeature {name:"Load To Imepay"})
            MERGE (esewa: TestFeature {name:"Load To Esewa"})
            MERGE (khalti: TestFeature {name: "Load To Khalti"})

            MERGE (imepay)-[:BELONGS_TO]->(loadWallet)
            MERGE (esewa)-[:BELONGS_TO]->(loadWallet)
            MERGE (khalti)-[:BELONGS_TO]->(loadWallet)

            MERGE (bank: TestFeature {name:"Bank Statement"})
            MERGE (history: TestFeature {name:"Statement Request History"})
            MERGE (request: TestFeature {name:"Statement Request"})

            MERGE (bank)-[:BELONGS_TO]->(statement)
            MERGE (history)-[:BELONGS_TO]->(statement)
            MERGE (request)-[:BELONGS_TO]->(statement)

            MERGE (topup: TestFeature {name: "Mobile Topup"})
            MERGE (merchant: TestFeature {name: "Merchant Payment"})
            MERGE (tv: TestFeature {name: "Tv payment"})
            MERGE (government: TestFeature {name: "Government Payment"})

            MERGE (topup)-[:BELONGS_TO]->(payment)
            MERGE (merchant)-[:BELONGS_TO]->(payment)
            MERGE (tv)-[:BELONGS_TO]->(payment)
            MERGE (government)-[:BELONGS_TO]->(payment)

            MERGE (ibft: TestFeature {name: "IBFT"})
            MERGE (fonepay: TestFeature {name: "Fonepay Direct"})
            MERGE (gibl: TestFeature {name: "GIBL Fund Transfer"})

            MERGE (ibft)-[:BELONGS_TO]->(transfer)
            MERGE (fonepay)-[:BELONGS_TO]->(transfer)
            MERGE (gibl)-[:BELONGS_TO]->(transfer)
            WITH *
            MATCH (menu:TestMenu)
            RETURN menu.name AS allMenu
    `,{}))
    let seedResponse = response.records.map(row => row.get('allMenu'));
        if(seedResponse){
            return seedResponse
        }
        }
        return data
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close()
    }
}

const targetedUser =  async(req, res)=>{
    const session = driver.session();
    // const {transaction} = req.body || {transaction:''};
    const {transaction} = req.body;
    try{
        const response = await session.readTransaction(tx=> tx.run(
            `
            MATCH (t1:Transaction {name: $transaction})<-[:CONFIRMED]-(user:TestUser)-[:KNOWS*1]-(user2:TestUser)
            WHERE user2 <> user
            RETURN distinct user2.name as User
            `, {transaction}
        ))
        let data = response.records.map(row => row.get('User'));
        return res.json({data})
    }
    catch(err){
        console.log(err)
    }
    finally{
        await session.close()
    }
}






module.exports = {
    saveIntraction,
    getRecommendation,
    getUser,
    targetedUser
}