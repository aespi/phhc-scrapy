const ENGINE = require('./trymeagain');
// const date = "20/04/2024";
// ENGINE.start(date);
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
// Function to watch for changes to the app.js file
function watchAppJS(callback) {
  // Path to the directory containing app.js
  const directoryPath = __dirname; // Change this if app.js is in a different directory

  // Start watching the directory for changes
  fs.watch(directoryPath, (eventType, filename) => {
    // Check if the changed file is app.js
    if (filename === 'data.csv') {
      // Execute the callback function
      callback();
    }
  });
}

// Route to handle PDF generation request
app.get('/download', (req, res) => {
  const filePath = __dirname + '/data.csv'; // Change this if app.js is in a different directory
  const date = req.query.date;
  //   fs.unlink(filePath, async err => {
  //     if (err) {
  //       console.error('Error deleting file:');
  //     } else {
  try {
    ENGINE.start(date);
  } catch (err) {
    res.status(500).send('FAILEDDDDDD!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!###########');
  }
  watchAppJS(async () => {
    console.log('data.csv has been generated or modified!');
    res.download(filePath, function (err) {
      if (err) {
        console.log(err, 'FAILEDD TO DOWNLOAD FILE');
        res.status(500).send('FAILEDDDDDD!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!###########');
      } else {
        console.log('FILE DOWNLOADEDDD BITCHH');
      }
    });
  });
  // }
});
// });

// Route to serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
