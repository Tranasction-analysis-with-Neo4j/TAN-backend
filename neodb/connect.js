
const neo4j = require('neo4j-driver')

let driver;

function initDriver(uri, username, password) {
  driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

  return driver.verifyConnectivity()
    .then(()=> driver)
}

function getDriver() {
  return driver
}

function closeDriver() {
  return driver && driver.close()
}


module.exports = {
    initDriver,
    getDriver,
    closeDriver
}