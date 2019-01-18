//
//  Created by Gabriel Lumbi on 2015-03-10.
//  Copyright (c) 2015 Gabriel Lumbi. All rights reserved.
//

// FILE SYSTEM
var fs = require('fs');

// HTTPS

var https = require('https');
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

// EXPRESS
var express = require('express');
var app = express();

if(process.env.HTTPS)
{
  app.set('port', (process.env.HTTPS_PORT || 8080));
} else {
  app.set('port', (process.env.PORT || 8443));
}
app.use(express.static(__dirname + '/public'));

// BODY-PARSER
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '20mb'}));

// MONGOOSE
var mongoose = require('mongoose');
mongoose.connect('mongodb://pfe-virtualtag-backend:longevalUnqualitied@ds051720.mongolab.com:51720/pfe-virtualtag');

// ROUTES
var route_virtualtags = require('./routes/virtualtags')
app.use('/virtualtags', route_virtualtags);

var route_users = require('./routes/users');
app.use('/users', route_users);

// BACKGROUND CLEAN TASK
var backgroundClean = require('./background/clean');
// backgroundClean(); TODO: Fixed bug in clean.js

var httpsServer;

// Start server
if(process.env.HTTPS)
{
  httpsServer = https.createServer(credentials, app);
  httpsServer.listen((process.env.HTTPS_PORT || 8443), function(){
    console.log('virtualtag-backend is running on port : ' + app.get('port'));
  });
} else {
  app.listen(app.get('port'), function() {
    console.log('virtualtag-backend is running on port : ' + app.get('port'));
  });
}
