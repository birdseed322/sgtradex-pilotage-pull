'use strict';
require('dotenv').config()
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const db = {};

const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PW, {
  host: process.env.DATABASE_HOST,
  dialect: 'mysql',
  dialectModule: require('mysql2'),
  timezone: '+08:00'
});

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
  }, time_pushed: {
    type: DataTypes.DATE,
    allowNull: false
  },
}, {
  freezeTableName: true
})

PilotageInformation.sync({ alter: true })

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = { db, PilotageInformation };
