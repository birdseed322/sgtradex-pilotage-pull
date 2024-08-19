const fs = require('fs');
const path = require('path');
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

app.get('/pilotage/peek_db', async (req, res) => {
    try {
        const pilotageInfo = await models.PilotageInformation.findOne();
        res.send(pilotageInfo);
    } catch (e) {
        res.send(e);
    }
})


app.get('/haulier/peek_db', async (req, res) => {
    try {
        const gpsInfo = await models.HaulierGPS.findOne();
        res.send(gpsInfo);
    } catch (e) {
        res.send(e);
    }
})

app.get('/hidden/destroy_db', async (req, res) => {
    try {
        await models.PilotageInformation.drop();
        await models.HaulierGPS.drop();

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

app.get('/export/pilotage_data', async (req, res) => {
    //Potentially provide option to retrieve dates.
    try {
        const pilotageRecords = await models.PilotageInformation.findAll();
        const csvFilePath = path.join('tmp', 'pilotage_information.csv');
        const csvWriter = createCsvWriter({
            path: csvFilePath,
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
                { id: 'request_id', title: 'request_id' },
                { id: 'time_pushed_batch', title: 'time_pushed_batch' },
                { id: 'time_pushed_request', title: 'time_pushed_request' },
            ],
        });

        await csvWriter.writeRecords(pilotageRecords);
        const fileContent = fs.readFileSync(csvFilePath);

        res.setHeader('Content-Disposition', 'attachment; filename="pilotage_information.csv"');
        res.setHeader('Content-Type', 'text/csv');
        res.send(fileContent);
    } catch (error) {
        console.error('Error downloading CSV:', error);
        res.status(500).send('Internal Server Error');
    }
})


app.get('/export/haulier_data', async (req, res) => {
    try {
        const haulierRecords = await models.HaulierGPS.findAll();
        const csvFilePath = path.join('tmp', 'haulier_information.csv');
        const csvWriter = createCsvWriter({
            path: csvFilePath,
            header: [
                { id: 'haulier_nm', title: 'haulier_nm' },
                { id: 'position_latitude', title: 'position_latitude' },
                { id: 'position_longitude', title: 'position_longitude' },
                { id: 'heading', title: 'heading' },
                { id: 'haulier_uen', title: 'haulier_uen' },
                { id: 'geofence_of_interest', title: 'geofence_of_interest' },
                { id: 'vehicle_speed', title: 'vehicle_speed' },
                { id: 'vehicle_no', title: 'vehicle_no' },
                { id: 'position_altitude', title: 'position_altitude' },
                { id: 'snapshot_dt', title: 'snapshot_dt' },
                { id: 'time_pushed_request', title: 'time_pushed_request' },
            ],
        });

        await csvWriter.writeRecords(haulierRecords);
        const fileContent = fs.readFileSync(csvFilePath);

        res.setHeader('Content-Disposition', 'attachment; filename="haulier_information.csv"');
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
        batchTime.setSeconds(0);
        let offSetMin = batchTime.getMinutes();
        batchTime.setMinutes(offSetMin - (offSetMin % 30));
        const reqId = reqBody.participants[0].request_id
        const pilotageInformation = reqBody.payload;

        // Extract unique keys for checking existence. Assumes no duplicate unique keys
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
            time_pushed_batch: new Date(record.time_pushed_batch),
            pilotage_nm: record.pilotage_nm,
        }));

        const existingKeySet = new Set();

        // Use Promise.all to wait for all create operations to complete
        await Promise.all(pilotageInformation.map(async (info) => {
            // Check if the record already exists
            const key = {
                time_pushed_batch: batchTime,
                pilotage_nm: info.pilotage_nm,
            };

            const keyString = JSON.stringify(key);

            if ((!existingKeys.find(existingKey => existingKey.time_pushed_batch.toUTCString() == key.time_pushed_batch.toUTCString() && existingKey.pilotage_nm == key.pilotage_nm) && (!existingKeySet.has(keyString)))) {
                existingKeySet.add(keyString);
                // If record doesn't exist, create it
                await models.PilotageInformation.create({
                    pilotage_cst_dt_time: new Date(info.pilotage_cst_dt_time),
                    pilotage_nm: info.pilotage_nm,
                    pilotage_imo: info.pilotage_imo,
                    pilotage_loc_from_code: info.pilotage_loc_from_code,
                    pilotage_loc_to_code: info.pilotage_loc_to_code,
                    pilotage_arrival_dt_time: info.pilotage_arrival_dt_time? new Date(info.pilotage_arrival_dt_time) : null,
                    pilotage_onboard_dt_time: info.pilotage_onboard_dt_time? new Date(info.pilotage_onboard_dt_time) : null,
                    pilotage_start_dt_time: info.pilotage_start_dt_time? new Date(info.pilotage_start_dt_time): null,
                    pilotage_end_dt_time: info.pilotage_end_dt_time? new Date(info.pilotage_end_dt_time): null,
                    verified: "NOT APPLICABLE",
                    time_pushed_batch: batchTime,
                    time_pushed_request: now,
                    request_id: reqId
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


app.post('/data/receive/haulier_gps', async (req, res) => {
    try {
        const reqBody = req.body;
        console.log(req.body)
        const currentDateInTargetTimeZone = moment().tz(targetTimeZone);
        const now = currentDateInTargetTimeZone.toDate();
        let batchTime = new Date(now);
        batchTime.setSeconds(0);
        const haulierGPS = reqBody.payload;
        Promise.all(haulierGPS.map(async (info) => {
            await models.HaulierGPS.create({
                haulier_nm: info.haulier_nm,
                position_latitude: info.position_latitude,
                position_longitude: info.position_longitude,
                heading:info.heading,
                haulier_uen: info.haulier_uen,
                geofence_of_interest: info.geofence_of_interest,
                vehicle_speed: info.vehicle_speed,
                vehicle_no: info.vehicle_no,
                position_altitude: info.position_altitude,
                snapshot_dt: info.snapshot_dt,
                time_pushed_request: batchTime
            });
            console.log("Saved");
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