var mongoose = require("mongoose");
var express = require("express");
var logger = require("morgan");
var mongojs = require("mongojs");

var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static("public"));

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var mongoURI = 'mongodb://heroku_tjsndg72:a7ncs69kucnbmsb7rksbtgu4ot@ds151997.mlab.com:51997/heroku_tjsndg72';
var MONGODB_URI = mongoURI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, {useNewUrlParser: true});
//Heroku MongoDB is Connected and Working.

//db.Article.create({Headline: "Trump sucks", Summary: "Fuck Donald Trump"});

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  var data = [];
  var result = {};
  // First, we grab the body of the html with axios
  axios.get("http://www.theverge.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    // Now, we grab every h2 within an article tag, and do the following:
    $(".c-compact-river").each(function (i, element) {
      // Save an empty result object
      $(".c-compact-river__entry ").each(function (j, element) {
        //result.headline = $(element).find("h2").text();
        const link = $(element).find("a").attr("href");
        //its working
        //console.log(result);
        //console.log(link);
        axios.get(link).then(function (response) {
          $ = cheerio.load(response.data);
          //console.log($(".c-entry-hero").find("c-entry-summary").text());
          //console.log($(".c-entry-hero").child("c-entry-summary").text());
          result.headline = $('.c-page-title').text();
          result.link = link;
          var j = $(".p-dek").text().split('Filed Under: ')[0];
          result.summary = j;
          db.Article.create(result)
            .then(function (dbArticle) {
              // View the added result in the console
              console.log(dbArticle);
            })
            .catch(function (err) {
              // If an error occurred, log it
              console.log(err);
            });
        });
      });
    });
  });


  // Create a new Article using the `result` object built from scraping

  // Send a message to the client
  res.send("Scrape Complete");
});

app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
  // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
