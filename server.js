const fs = require('fs');
require('dotenv').config();
const express = require('express');
const app = express();
const process = require('process');
const bodyParser = require('body-parser');
const models = require('./models');
const moment = require('moment-timezone');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const sequelize = models.sequelize;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const targetTimeZone = 'Asia/Singapore';


app.listen('3000', async () => {
    try {
        console.log('Connection with DB has been established successfully.');
        console.log('Server listening on port 3000 and ready to receive requests');

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})

app.get('/', (req, res) => {
    res.send('Deployed');
})

app.get('/test', (req, res) => {
    res.send('Test');
})

app.get('/peek_db', async (req, res) => {
    try {
        const pilotageInfo = await models.PilotageInformation.findOne();
        res.send(pilotageInfo);
    } catch (e) {
        res.send(e);
    }
})

app.get('/hidden/destroy_db', async (req, res) => {
    try {
        await models.PilotageInformation.drop();

        const boom = ` DB destroyed!
          _ ._  _ , _ ._
        (_ ' ( \`  )_  .__)
      ( (  (    )   \`)  ) _)
     (__ (_   (_ . _) _) ,__)
         \`~~\`\\ ' . / \`~~\`
              ;   ;
              /   \\
_____________/_ __ \\_____________
  `;
        res.send(boom)
    } catch (e) {
        res.send(e);
    }
})

app.get('/export_pilotage_data', async (req, res) => {
    //Potentially provide option to retrieve dates.
    try {
        const pilotageRecords = await models.PilotageInformation.findAll();

        const csvWriter = createCsvWriter({
            path: '/tmp/pilotage_information.csv',
            header: [
                { id: 'pilotage_cst_dt_time', title: 'pilotage_cst_dt_time' },
                { id: 'pilotage_nm', title: 'pilotage_nm' },
                { id: 'pilotage_imo', title: 'pilotage_imo' },
                { id: 'pilotage_loc_from_code', title: 'pilotage_loc_from_code' },
                { id: 'pilotage_loc_to_code', title: 'pilotage_loc_to_code' },
                { id: 'pilotage_arrival_dt_time', title: 'pilotage_arrival_dt_time' },
                { id: 'pilotage_onboard_dt_time', title: 'pilotage_onboard_dt_time' },
                { id: 'pilotage_start_dt_time', title: 'pilotage_start_dt_time' },
                { id: 'pilotage_end_dt_time', title: 'pilotage_end_dt_time' },
                { id: 'verified', title: 'verified' },
                { id: 'time_pushed', title: 'time_pushed'}
            ],
        });

        await csvWriter.writeRecords(pilotageRecords);
        const fileContent = fs.readFileSync('/tmp/pilotage_information.csv');

        res.setHeader('Content-Disposition', 'attachment; filename="pilotage_information.csv"');
        res.setHeader('Content-Type', 'text/csv');
        res.send(fileContent);
    } catch (error) {
        console.error('Error downloading CSV:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/data/receive/pilotage_service', (req, res) => {
    const reqBody = req.body;
    const currentDateInTargetTimeZone = moment().tz(targetTimeZone);
    const now = currentDateInTargetTimeZone.toDate();
    const pilotageInformation = reqBody.payload;
    pilotageInformation.forEach(async (info) => {
        await models.PilotageInformation.create({
            pilotage_cst_dt_time: new Date(info.pilotage_cst_dt_time),
            pilotage_nm: info.pilotage_nm,
            pilotage_imo: info.pilotage_imo,
            pilotage_loc_from_code: info.pilotage_loc_from_code,
            pilotage_loc_to_code: info.pilotage_loc_to_code,
            pilotage_arrival_dt_time: info.pilotage_arrival_dt_time,
            pilotage_onboard_dt_time: info.pilotage_onboard_dt_time,
            pilotage_start_dt_time: info.pilotage_start_dt_time,
            pilotage_end_dt_time: info.pilotage_end_dt_time,
            verified: "NOT APPLICABLE",
            time_pushed: now
        });
        console.log("Saved")
    })
    res.send('Received');
})

app.post('/test/createTable', (req, res) => {
    try {
        res.send('Successfully created table');
    } catch (e) {
        console.log('Failed to create table: ' + e);
        res.status(500);
    }
})

module.exports = app;