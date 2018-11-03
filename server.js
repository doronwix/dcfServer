
////https://radiant-wave-47361.herokuapp.com/
const fs = require('fs');
const HtmlExtractor = require('html-extract-js');
const https = require('https');
const request = require('request');
const rp = require('request-promise');
const parseXbrl = require('parse-xbrl-10k');
const yahoo = require('./routes/yahoo');
const sec = require('./routes/sec');
const test = require('./routes/test');



 

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var tenKurl = [];

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/', router);
app.use('/api/yahoo', yahoo);
app.use('/api/sec', sec);
app.use('/api/test', test);


// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)

router.get('/sec/:year/:symbolId', function(req, res) {

});








