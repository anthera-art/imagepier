const express = require('express');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const mysql = require("mysql2/promise");
const {resolve} = require("path");
const bodyParser = require("express");

const app = express();
const PORT = 13415;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

dotenv.config({path: resolve('../.env')});
const config = process.env; // Parse the JSON output

const connection = mysql.createPool({
    host: config.DATABASE_HOSTNAME,
    user: config.DATABASE_USERNAME,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME,
    connectionLimit: 10,
});

async function Screenshot(url) {
    console.log("launching browser");
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--force-device-scale-factor=1'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({width: 1280, height: 720});
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

    const screenshot = await page.screenshot({type: 'png'});
    await browser.close();

    return screenshot;
}

app.post('/embed/me', async (req, res) => {
    if (!req.body) {
        return res.status(400).json({error: 'Missing URL parameter'});
    }

    var [data, r] = await connection.query("SELECT * FROM ACT_AntheraMe WHERE `ID` = ?", [req.body.data.ID]);

    if (data.length === 0) return res.status(404).json({error: 'No matching record found'});

    var url = config.DM_HTTPS + "://" + data[0].Domain + "." + config.ME_DOMAIN + "/embed";

    try {
        var screenshot = await Screenshot(url);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', screenshot.length);
        res.end(screenshot); // Use res.end instead of res.send
    } catch (error) {
        res.status(500).json({error: 'Failed to capture screenshot', details: error.message});
    }
});


app.listen(PORT, '127.0.0.1', () => {
    console.log(`Screenshot server running at http://127.0.0.1:${PORT}`);
});