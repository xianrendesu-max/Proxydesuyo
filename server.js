const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('.'));

let accessLogs = [];
let maintenanceMode = false;

// Middleware for maintenance
app.use((req, res, next) => {
  if (maintenanceMode && !req.path.startsWith('/Admin/sennin')) {
    return res.sendFile(path.join(__dirname, 'error.html'));
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const log = { time: new Date().toISOString(), url: req.url, method: req.method };
  accessLogs.push(log);
  console.log(log);
  next();
});

// Home page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));

// Admin page
app.get('/Admin/sennin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Get access logs
app.get('/api/logs', (req, res) => res.json(accessLogs));

// Toggle maintenance
app.post('/api/maintenance', (req, res) => {
  maintenanceMode = !!req.body.enabled;
  res.json({ success: true, maintenance: maintenanceMode });
});

// Sites JSON
app.get('/sites.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'sites.json'));
});

// Puppeteer proxy route
app.get('/page', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.sendFile(path.join(__dirname, 'error.html'));
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const content = await page.content();
    await browser.close();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, 'error.html'));
  }
});

// Catch-all 404
app.use((req, res) => res.sendFile(path.join(__dirname, 'error.html')));

app.listen(port, () => console.log(`Server running on port ${port}`));
