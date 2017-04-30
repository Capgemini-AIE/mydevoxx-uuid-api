'use strict';
let express = require('express'), http = require('http'), path = require('path'), fs = require('fs');

let app = express();

let logger = require('morgan');
let errorHandler = require('errorhandler');
let bodyParser = require('body-parser');
let req = require('then-request');
let basic = require('basic-authorization-header');

let devoxxUuidEndpoint;
let devoxxPrivateEndpointpoint;
let authHeader;

const winston = require('winston');
winston.level = 'debug';

winston.log('info', 'Launching app');

/**
 * Setup for all environment variables
 */
app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

let allowedOrigins = ['https://mydevoxx-dashboard.eu-gb.mybluemix.net'];

//Sets Env Variables based on environment
if ('development' === app.get('env')) {
    winston.log('info', 'Launching in development mode');
    app.use(errorHandler());

    // Update allowed origins
    allowedOrigins.concat(['https://localhost:3000', 'http://localhost:3000', ]);

    //Set up Wiremock Basic Auth
    authHeader = {
        'Authorization': basic('test@test.com', 'test')
    };

    //Wiremock URL for UUID
    devoxxUuidEndpoint = 'https://aston-wiremock.eu-gb.mybluemix.net/uuid';

    //Wiremock URL for Schedulued and Favored Talks
    devoxxPrivateEndpointpoint = 'https://aston-wiremock.eu-gb.mybluemix.net/';
} else {
    winston.log('info', 'Launching in production mode');
    //Set up BasicAuth Header
    authHeader = {
        'Authorization': basic(process.env.username, process.env.password)
    };
    winston.log('debug', '[EMAIL] ' + process.env.username);
    //Devoxx API URLS to retrieve a users UUID
    devoxxUuidEndpoint = 'http://cfp.devoxx.co.uk/uuid';

    //Retrieving the favourites and scheduled talks for the retrieved UUID
    devoxxPrivateEndpointpoint = 'http://cfp.devoxx.co.uk/api/proposals';
}

app.use((req, res, next) => {
    // Localhost is only fine in dev mode.
    let origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    return next();
});


/**
 * GET - uuid for user
 * Receives user email from devoxx dashboard ->
 * Returns UUID to devoxx dashboard to get user specific data
 */
app.get('/uuid', (request, response) => {
    let userEmail = request.query.email;
    let url = devoxxUuidEndpoint +'?email=' + userEmail;
    winston.log('debug', '[HTTP] Calling Devoxx with URL: ' + url);
    req('GET', url, {headers: authHeader}).then((res) => {
        winston.log('debug', '[HTTP] Response from devoxx with status: ' + res.statusCode);
        response.setHeader('Content-Type', 'text/plain');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        winston.log('debug', '[HTTP] Response from devoxx with error: ' + err.toString());
        response.setHeader('Content-Type', 'text/plain');
        response.status = 404;
        response.write("UUID not returned for email address given");
        response.end();
    })
});

/**
 * GET - scheduled talks for user
 * Returns the scheduled talks for the recieved uuid
 */
app.get('/scheduled', (request, response) => {
    let uuid = request.query.uuid;
    let url = devoxxPrivateEndpointpoint + '/' + uuid + '/scheduled';
    winston.log('debug', '[HTTP] Calling Devoxx with URL: ' + url);

    req('GET', url, {headers: authHeader}).then((res) => {
        winston.log('debug', '[HTTP] Response from devoxx with status: ' + res.statusCode);
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        winston.log('debug', '[HTTP] Response from devoxx with error: ' + err.toString());
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Scheduled talks not returned for email address given");
        response.end();
    })
});


/**
 * GET - favored talks for user
 * Returns the favored talks for the recieved uuid
 */
app.get('/favored', (request, response) => {
    let uuid = request.query.uuid;
    let url = devoxxPrivateEndpointpoint + '/' + uuid + '/favored';
    winston.log('debug', '[HTTP] Calling Devoxx with URL: ' + url);

    req('GET', url, {headers: authHeader}).then((res) => {
        winston.log('debug', '[HTTP] Response from devoxx with status: ' + res.statusCode);
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        winston.log('debug', '[HTTP] Response from devoxx with error: ' + err.toString());
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Favored Talks not returned for email address given");
        response.end();
    })
});

http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;