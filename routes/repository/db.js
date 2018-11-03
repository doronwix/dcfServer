/* const { Client } = require('pg'); //postgresql
const connectionString = "postgres://postgres:postgres@localhost:5432/postgres";

const client = new pg.Client(conn);
client.connect();
const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/todo',
    ssl: false,
  });
  
  client.connect();

  client.query('create table reports(name varchar(20), data jsonb)', (err, res) => {
    if (err) throw err;
  });
module.exports.create = (fileName, data) => {
    client.query('INSERT INTO reports VALUES (' + fileName + ', ' + data + ');', (err, res) => {
        if (err) throw err;
        client.end();
      });
    
} 

module.exports.get = (fileName) => {
    let result = {};
    client.query('Select data From reports Where name=' + fileName + ';', (err, res) => {
        if (err) throw err;
        result =  res;
        client.end();
      });
      return result;
} 

module.exports.isExists = (path, fileName) => {
    let result = {};
    client.query('Select count(*) From reports Where name=' + fileName + ';', (err, res) => {
        if (err) throw err;
        result =  res;
        client.end();
      });
    return result;
} 
 */