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
    console.log(req.body)
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
        console.log(data)
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