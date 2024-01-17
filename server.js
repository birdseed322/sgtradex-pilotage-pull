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
const lodash = require('lodash');


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
                { id: 'time_pushed_batch', title: 'time_pushed_batch' },
                { id: 'time_pushed_request', title: 'time_pushed_request' },
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

app.post('/data/receive/pilotage_service', async (req, res) => {
    try {
        const reqBody = req.body;
        const currentDateInTargetTimeZone = moment().tz(targetTimeZone);
        const now = currentDateInTargetTimeZone.toDate();
        let batchTime = new Date(now);
        batchTime = batchTime.setSeconds(0);
        const offSetMin = batchTime.getMinutes();
        batchTime = batchTime.setMinutes(offSetMin - (offSetMin % 30));
        const pilotageInformation = reqBody.payload;

        // Extract unique keys for checking existence
        const uniqueKeys = pilotageInformation.map(info => ({
            time_pushed_batch: batchTime,
            pilotage_nm: info.pilotage_nm,
        }));

        // Check for existing records
        const existingRecords = await models.PilotageInformation.findAll({
            where: {
                [models.db.Op.or]: uniqueKeys,
            },
        });

        // Extract existing keys for quick lookup
        const existingKeys = existingRecords.map(record => ({
            time_pushed_batch: record.time_pushed_batch,
            pilotage_nm: record.pilotage_nm,
        }));

        // Use Promise.all to wait for all create operations to complete
        await Promise.all(pilotageInformation.map(async (info) => {
            // Check if the record already exists
            const key = {
                time_pushed_batch: batchTime,
                pilotage_nm: info.pilotage_nm,
            };

            if (!existingKeys.find(existingKey => lodash.isEqual(existingKey, key))) {
                // If record doesn't exist, create it
                await models.PilotageInformation.create({
                    pilotage_cst_dt_time: new Date(info.pilotage_cst_dt_time),
                    pilotage_nm: info.pilotage_nm,
                    pilotage_imo: info.pilotage_imo,
                    pilotage_loc_from_code: info.pilotage_loc_from_code,
                    pilotage_loc_to_code: info.pilotage_loc_to_code,
                    pilotage_arrival_dt_time: new Date(info.pilotage_arrival_dt_time),
                    pilotage_onboard_dt_time: new Date(info.pilotage_onboard_dt_time),
                    pilotage_start_dt_time: new Date(info.pilotage_start_dt_time),
                    pilotage_end_dt_time: new Date(info.pilotage_end_dt_time),
                    verified: "NOT APPLICABLE",
                    time_pushed_batch: batchTime,
                    time_pushed_request: now,
                });
                console.log("Saved");
            } else {
                console.log("Record already exists. Skipped.");
            }
        }));

        res.send('Received');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/test/createTable', (req, res) => {
    try {
        res.send('Successfully created table');
    } catch (e) {
        console.log('Failed to create table: ' + e);
        res.status(500);
    }
})

module.exports = app;