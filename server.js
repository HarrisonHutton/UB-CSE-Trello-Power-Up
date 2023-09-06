var cors = require('cors');
var express = require('express');
var app = express();

app.use(cors({ origin: 'https://trello.com' }));