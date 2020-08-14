////https://radiant-wave-47361.herokuapp.com/
const fs = require("fs");
const HtmlExtractor = require("html-extract-js");
const https = require("https");
const request = require("request");

//const parseXbrl = require("parse-xbrl-10k");
const yahoo = require("./routes/yahoo");
const yahooApi = require("./routes/yahooApi");
const sec = require("./routes/sec");
//const test = require("./routes/spawnpython");
const assets = require("./routes/assets");
const listOfStocks = require("./routes/listOfStocks");

// BASE SETUP
// =============================================================================

// call the packages we need
var express = require("express"); // call express
var app = express(); // define our app using express
var bodyParser = require("body-parser");
var tenKurl = [];

// Add headers
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});
// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(express.static('assets'));

var port = process.env.PORT || 8080; // set our port..

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); // get an instance of the express Router

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use("/", router);
app.use("/api/nasdaq", assets);
app.use("/api/yahoo", yahoo);
app.use("/api/sec", sec);
app.use("/api/rate", yahooApi);
app.use("/api/stocklist", listOfStocks);
//app.use("/api/test", test);

app.use((error, req, res, next) => {
  return res.status(500).json({ error: error.toString() });
});

// START THE SERVER
// =============================================================================
app.listen(port);
console.log("Magic happens on port " + port);

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)

router.get("/sec/:year/:symbolId", function (req, res) {});
