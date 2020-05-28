// Load required packages
//
const express = require("express");
const bodyParser = require("body-parser");
const moment = require("moment");
const chrono = require("chrono-node");
const accents = require('remove-accents');
const { Octokit } = require("@octokit/rest");

// Init GitHub connection
//
const github = new Octokit({
  auth: process.env.GH_TOKEN
});

// Init server
//
var app = express();
app.use(bodyParser.text());

// Do things with incoming requests
//
app.post("/", (req, res) => {
  console.info("Received request at " + moment().format("YYYY-MM-DD HH:mm:ss ZZ"));
  
  // Reject requests without the right secret
  //
  if (req.query.token !== process.env.WEBHOOK_TOKEN) {
    console.error("Got bad secret \"" + req.query.secret + "\" (should have been \"" + process.env.WEBHOOK_SECRET + "\")");
    res.sendStatus(400);
  }

  // Set incoming post category, or none
  //
  var postPath;
  if (req.query.category === null || req.query.category.length === 0) {
    postPath = "_posts"
  } else {
    postPath = req.query.category + "/_posts"
  }

  // Cleanup formatting of incoming post, replace special chracters, etc.
  //
  //    1. Replace ||| with newlines
  //    2. Replace |@ with literal |
  //    3. Replace @@@ with <!--more-->
  //    4. Strip empty elements at the beginning of any lists
  //    5. Strip empty elements at the end of any lists
  //    6. Replace any double <p><p> with a single <p>
  //    7. Replace any double </p></p> with a single </p>
  //    8. Replace { with &#x007b; to work around Jekyll parsing weirdness.
  //    9. Replace } with &#x007d; to work around Jekyll parsing weirdness.
  //   10. Replace % with &#x0023; to work around Jekyll parsing weirdness.
  //   11. Replace the sequence .### with just . (since this implies that we don't need ###)
  //   12. Finally, replace ### with ...
  //
  var postContent = req.body.replace(/\|\|\|/g, "\n");
  postContent = postContent.replace(/\|@/g, "|");
  postContent = postContent.replace(/@@@/g, "<!--more-->");
  postContent = postContent.replace(/\[ ("")? ?,/, "[ ");
  postContent = postContent.replace(/, ?("")? \]/, " ]");
  postContent = postContent.replace(/<p><p>/, "<p>");
  postContent = postContent.replace(/<\/p><\/p>/, "</p>");
  postContent = postContent.replace(/{/, "&#x007b;");
  postContent = postContent.replace(/}/, "&#x007d;");
  postContent = postContent.replace(/%/, "&#x0023;");
  postContent = postContent.replace(/\. *###/, ".");
  postContent = postContent.replace(/###/, "...");

  // Post date or now.
  //
  var postDate;
  var dateSearch = postContent.match(/date: ?(.+)\n/);
  if (dateSearch !== null && dateSearch.length > 0) {
    postDate = chrono.parseDate(dateSearch[1]);
  } else {
    postDate = new Date();
  }
  console.info("Post date is " + moment(postDate).format("YYYY-MM-DD HH:mm:ss ZZ"));
  postContent = postContent.replace(/date:.*\n/, "");
  postContent = postContent.replace(/---\n/, "---\ndate: " + moment(postDate).format("YYYY-MM-DD HH:mm:ss ZZ") + "\n");

  // Figure out the post title. Abort if none is set.
  //
  var postTitle;
  var titleSearch = postContent.match(/title: ?(.+)\n/);
  if (titleSearch !== null && titleSearch.length > 0) {
    postTitle = titleSearch[1].trim().replace(/^"/, "").replace(/"$/, "");
  } else {
    console.error("Missing or empty 'title' attribute in YAML frontmatter");
    res.sendStatus(400);
  }
  console.info("Post title is \"" + postTitle + "\"");
  postContent = postContent.replace(/title:.*\n/, "");
  postContent = postContent.replace(/---\n/, "---\ntitle: |\n  " + postTitle + "\n");

  // Create slug (for use in file names).
  //
  var slugTitle = moment(postDate).format("YYYY-MM-DD-") + (accents.remove(postTitle)).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  console.info("Post slug is " + slugTitle);

  // Post content to GitHub
  //
  github.repos.createOrUpdateFile({
    owner: process.env.GH_USER_OR_TEAM,
    repo: process.env.GH_REPO,
    branch: process.env.GH_BRANCH,
    path: postPath + "/" + slugTitle + ".html",
    message: "Post automatically pushed from IFTTT via Glitch",
    content: new Buffer(postContent).toString("base64")
  }, function(err, resp) {
    if (err) {
      console.log("Post creation failed! GitHub responded: " + err);
      res.sendStatus(500);
    } else {
      console.log("Post creation succeeded. GitHub responded: " + resp);
      res.sendStatus(200);
    }
  });
});

// Listen for incoming requests
//
var listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});