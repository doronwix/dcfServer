const express = require("express");
const router = express.Router();

const data = require('../assets/nasdaqtraded.json')

router.get('/', function (req, res) {
  res.header("Content-Type",'application/json');
  res.send(JSON.stringify(data));
})


module.exports = router;