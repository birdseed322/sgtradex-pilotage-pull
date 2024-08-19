'use strict';
require('dotenv').config()
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const db = {};

const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PW, {
  host: process.env.DATABASE_HOST,
  dialect: 'mysql',
  dialectModule: require('mysql2'),
  dialectOptions: {
    timezone: 'UTC'
  }
});

const HaulierGPS = sequelize.define('HaulierGPS', {
  haulier_nm: {
    type: DataTypes.STRING,
    allowNull: true
  },
  request_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  position_latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  position_longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  heading: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  haulier_uen: {
    type: DataTypes.STRING,
    allowNull: true
  },
  geofence_of_interest: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vehicle_speed: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  vehicle_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  position_altitude: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  snapshot_dt: {
    type:DataTypes.DATE,
    allowNull: false
  },
  time_pushed_request: {
    type: DataTypes.DATE,
    allowNull: false
  },
}, {
  freezeTableName: true
})

const PilotageInformation = sequelize.define('PilotageInformation', {
  pilotage_cst_dt_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  pilotage_nm: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pilotage_imo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pilotage_loc_from_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pilotage_loc_to_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pilotage_arrival_dt_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pilotage_onboard_dt_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pilotage_start_dt_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pilotage_end_dt_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verified: {
    type: DataTypes.STRING, // You might want to use BOOLEAN if it represents a true/false value
    allowNull: false,
  }, time_pushed_batch: {
    type: DataTypes.DATE,
    allowNull: false
  }, time_pushed_request: {
    type: DataTypes.DATE,
    allowNull: false
  }, request_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
}, {
  freezeTableName: true
})

HaulierGPS.sync({ alter: true })
PilotageInformation.sync({ alter: true })

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.Op = Op
module.exports = { db, PilotageInformation, HaulierGPS};
