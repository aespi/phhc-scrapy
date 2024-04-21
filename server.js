const ENGINE = require('./trymeagain');
// const date = "20/04/2024";
// ENGINE.start(date);
const express = require('express');
// const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
// const ongoingRequests = {};
// const cancelReq = new AbortController();
try {
  // Set the timeout to 10 minutes (600,000 milliseconds)
  const timeout = 600000; // 10 minutes in milliseconds

  // Set the timeout for all incoming requests
  app.use((req, res, next) => {
    req.setTimeout(timeout);
    res.setTimeout(timeout);
    next();
  });
  // Middleware
  // Function to watch for changes to the app.js file
  function watchAppJS(callback) {
    // Path to the directory containing app.js
    const directoryPath = __dirname; // Change this if app.js is in a different directory

    fs.watch(directoryPath, (eventType, filename) => {
      // Check if the changed file is app.js
      if (filename === 'data.csv') {
        // Execute the callback function
        callback();
      }
    });
  }

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  // Route to handle PDF generation request
  app.get('*', (req, res) => {
    const filePath = __dirname + '/data.csv'; // Change this if app.js is in a different directory
    const date = req.query.date;
    try {
      // if (ongoingRequests['/download']) {
      //   // Cancel previous request
      //   cancelReq.abort();
      //   delete ongoingRequests['/download'];
      // }
      // ongoingRequests['/download'] = req;
      ENGINE.start(date);
      watchAppJS(async () => {
        console.log('data.csv has been generated or modified!');
        res.download(filePath, 'data.csv', function (err) {
          if (err) {
            console.log(err, 'FAILEDD TO DOWNLOAD FILE');
            // res.status(500).send('FAILEDDDDDD!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!###########');
          } else {
            // delete ongoingRequests['/download'];
            console.log('FILE DOWNLOADEDDD BITCHH');
            // res.status(200).send('Thanksss!!');
          }
        });
      });
    } catch (err) {
      console.log(err);
      res.status(500).send('FAILEDDDDDD!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!###########');
    }
    // }
  });
  // });

  // Route to serve the HTML page

  // Start server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
} catch {
  console.log('UNEXPECTED ERROR!!');
}
