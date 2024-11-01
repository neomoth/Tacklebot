const sqlite3 = require('sqlite3')
const fs = require('fs')
const path = require('path')
const logger = require('./log.js')

var db;

const tableName = 'users';

const desiredColumns = {
	id: 'INTEGER PRIMARY KEY',
	money: 'INTEGER DEFAULT 0',
	scavengeTimestamp: 'INTEGER DEFAULT 0',
}

module.exports = {
	database:db,
	promise:function(dbfunc, ...args){
		const that = this;
		return new Promise(function(resolve, reject) {
			dbfunc(...args,function(err, res){
				if(err) reject(err);
				else resolve(res);
			});
		});
	},
	connect:async()=>{
		// logger.info('Connecting to database...');
		db = new sqlite3.Database(path.join(__dirname, 'db/users.sqlite'), err=>{
			if(err) {
				console.error('[FATAL]: There was a problem connecting to the database: '+err+'\nStack Trace:\n'+err.stack);
				throw err; // required, throw an error here.
			}
		});
		const createTableQuery = `
    		CREATE TABLE IF NOT EXISTS ${tableName} (
      			${Object.entries(desiredColumns)
        			.map(([column, type]) => `${column} ${type}`)
        			.join(', ')}
    			)
  			`;
  		db.run(createTableQuery, (err) => {
	    	if (err) {
    	  		console.error('Error creating table:', err.message);
    		} else {
      			console.log(`Table ${tableName} created or already exists.`);
      			appendColumns(); // Proceed to check for missing columns
    		}
  		});
	},
	//add user if they dont exist:
	addUser:async(userId,func=null)=>{
		return await db.run(`INSERT OR IGNORE INTO users (id) VALUES (?)`, [userId], func);
	},
	//add money to user column:
	addMoney:async(userId, amount, func=null)=>{
		return await db.run(`UPDATE users SET money = money + ${amount} WHERE id = ?`, [userId], func);
	},
	setMoney:async(userId, amount, func=null)=>{
		return await db.run(`UPDATE users SET money = ${amount} WHERE id = ?`, [userId], func);
	},
	delMoney:async(userId, amount, func=null)=>{
		return await db.run(`UPDATE users SET money = money - ${amount} WHERE id = ?`, [userId], func);
	},
	getMoney:async(userId, func=null)=>{
		const result = await db.get(`SELECT money FROM users WHERE id = ?`, [userId], func);
		return result.money;
	},
	wipeDatabase:async(func=null)=>{
		return await db.run(`DELETE FROM users`, func);
	},
	getAllUsers:async(func=null)=>{
		const result = await db.all(`SELECT * FROM users`, func);
		return result;
	},
	getUser:async(userId, func=null)=>{
		const result = await db.get(`SELECT * FROM users WHERE id = ?`, [userId], func);
		return result;
	},
	resetMoney:async(userId, func=null)=>{
		return await db.run(`UPDATE users SET money = 0 WHERE id = ?`, [userId], func);
	},
	resetAllMoney:async(func=null)=>{
		return await db.run(`UPDATE users SET money = 0`, func);
	},
	addMoneyAll:async(amount, func=null)=>{
		return await db.run(`UPDATE users SET money = money + ${amount}`, func);
	},
	delMoneyAll:async(amount, func=null)=>{
		return await db.run(`UPDATE users SET money = money - ${amount}`, func);
	},
	setMoneyAll:async(amount, func=null)=>{
		return await db.run(`UPDATE users SET money = ${amount}`, func);
	},
	setScavengeTimestamp:async(userId, timestamp, func=null)=>{
		return await db.run(`UPDATE users SET scavengeTimestamp = ${timestamp} WHERE id = ?`, [userId], func);
	},
	getScavengeTimestamp:async(userId, func=null)=>{
		const result = await db.get(`SELECT scavengeTimestamp FROM users WHERE id = ?`, [userId], func);
		return result.scavengeTimestamp;
	},
}

function appendColumns(){
	Object.entries(desiredColumns).forEach(([column, type]) => {
		const alterTableQuery = `ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`;
		db.run(alterTableQuery, (err) => {
		  if (err) {
			// Ignore errors that indicate the column already exists
			if (err.message.includes('duplicate column name')) {
			  console.log(`Column ${column} already exists. Skipping addition.`);
			} else {
			  console.error(`Error adding column ${column}:`, err.message);
			}
		  } else {
			console.log(`Column ${column} added to ${tableName}.`);
		  }
		});
	});
}