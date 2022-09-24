require('dotenv').config();
const mysql = require('mysql');
const helpers = require('./helpers');
function selectStmt(table, latest){
    let statement = `SELECT * from ${table} `;
    if (latest){
        statement = `SELECT * from ${table} ORDER BY id DESC LIMIT 1`
    }
    return statement;
}
const getPosts = sort => {
    let con = connect(), q;
    if (sort === '1') {
        q = `SELECT txid, userId, content, boosts, likes, createdDateTime, name, icon FROM retro.twetches order by likes desc LIMIT 50`
    }
    else if (sort === '2') {
        q = `SELECT txid, userId, content, boosts, likes, createdDateTime, name, icon FROM retro.twetches where boosts > 0 order by boosts desc`;
    }
    else if (sort === '3') {
        q = `SELECT txid, userId, content, boosts, likes, createdDateTime, name, icon FROM retro.twetches where userId = '14518' order by createdDateTime desc LIMIT 50`
    }
    else {
        q = `SELECT txid, userId, content, boosts, likes, createdDateTime, name, icon FROM retro.twetches order by createdDateTime desc LIMIT 50`;    
    }
    try {
        return new Promise((resolve, reject) => {
            con.query(q, function (err, result) {
                if (err) {console.log(err); reject(new Error("Error querying for twetches."));}
                if (result !== undefined){resolve(result)}
                else {reject(new Error("No Twetches found."))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
}
const getBoosts = pool => {
    let q = `SELECT txid, boosts FROM retro.twetches where boosts > 0 order by boosts desc`;
    try {
        return new Promise((resolve, reject) => {
            pool.query(q, function (err, result) {
                if (err) {console.log(err); reject(new Error("Error querying for twetches."));}
                if (result !== undefined){resolve(result)}
                else {reject(new Error("No Twetches found."))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
} 
const getUser = (pool, id) => {
    let q = `SELECT * from users where userId = ${id}`;
    try {
        return new Promise((resolve, reject) => {
            pool.query(q, function (err, result) {
                if (err) {console.log(err); reject(new Error("Error querying for user."));}
                if (result !== undefined){resolve(result)}
                else {reject(new Error("No User found."))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
}
const setUserProfile = (pool, user) => {
    let q = `SELECT * from users where userId = '${user.userId}'`;
    try {
        return new Promise((resolve, reject) => {
            pool.query(q, function (err, r) {
                if (err) {console.log(err); reject(new Error("Error querying for profile."));}
                if (r !== undefined) {
                    pool.query(`UPDATE users set avatar = '${user.avatar}', shareLink = '${user.share}', useDimely = ${user.auth} where userId = ${user.userId}`, function (err, result) {
                        resolve(true)
                    });
                }
                else {reject(new Error("No Profile found."))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
}
const setUserSub = (pool, user) => {
    let q = `SELECT * from users where userId = '${user.userId}'`;
    try {
        return new Promise((resolve, reject) => {
            pool.query(q, function (err, r) {
                if (err) {console.log(err); reject(new Error("Error querying for profile."));}
                if (r !== undefined) {
                    pool.query(`UPDATE users set subscription = '${JSON.stringify(user.sub)}' where userId = ${user.userId}`, function (err, result) {
                        resolve(true)
                    });
                }
                else {reject(new Error("No Profile found."))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
}
const getReadability = (pool, url) => {
    let q = `SELECT readability FROM retro.posts where content like '%${url}%'`;
    try {
        return new Promise((resolve, reject) => {
            pool.query(q, function (err, r) {
                if (err) {console.log(err); reject(new Error("Error querying Post for txid: ${txid}."));}
                if (r !== undefined) { resolve(r) }
                else {reject(new Error(`No Twetch found for txid: ${txid}`))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
}
const insertTx = (con, post) => {
    let fields = ['txid', 'userId', 'content', 'likes', 'boosts', 'createdDateTime', 'name', 'icon', 'readability'], values = [];
    if (post?.content) {
        post = {
            transaction: post.txid,
            bContent: post.content,
            userId: post.userId,
            userByUserId: {
                name: post.name,
                icon: post.icon,
            },
            createdAt: post.createdDateTime,
            numLikes: 0
        }
    }
    if (post?.userByUserId?.name) {
        con.query(`SELECT * from twetches where txid = '${post.transaction}'`, async(err, r) => {
            if (err) {console.log(err)}
            if (r.length === 0) {
                let content = helpers.replaceAll(post.bContent, "'", "''");
                const regex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gi);
                const match = post.bContent.match(regex);
                if (match?.length && (!match[0].includes('youtu') && !match[0].includes('twetc') && !match[0].includes('bitcoinfile') && !match[0].includes('twitter'))) {
                    console.log(match[0]);
                    let read;
                    try {
                        read = await helpers.readability(match[0]);
                    } catch(e) {
                        console.log(e);
                        read = '';
                    }
                    values = [post.transaction, post.userId, content, post.numLikes, 0, post.createdAt, post.userByUserId.name, post.userByUserId.icon, read];
                    let q = this.insert('twetches', fields, values);
                    con.query(q, (err, result) => {
                        if (err) {console.log(err)}
                        if (result?.affectedRows > 0) { console.log('Inserted.') }
                    });
                }
                else {
                    values = [post.transaction, post.userId, content, post.numLikes, 0, post.createdAt, post.userByUserId.name, post.userByUserId.icon, ''];
                    let q = this.insert('twetches', fields, values);
                    con.query(q, (err, result) => {
                        if (err) {console.log(err)}
                        if (result?.affectedRows > 0) { console.log('Inserted.') }
                    });
                }
            }
            else {
                let uq = `UPDATE twetches set likes = ${post.numLikes} where id = ${r[0].id}`;
                con.query(uq, (err, result) => {
                    if (!result?.affectedRows > 0) { console.log('Error with result of query.', err)  }
                })
            }
        });
    }
}
const insertStmt = (table, fields, values, upsert) => {
    let statement = `INSERT ${upsert === true ? 'IGNORE' : ''} INTO ${table} (`;
    for(let i=0;i<fields.length;i++) {
        statement+=fields[i];
        if (i===values.length-1) {
            statement+=') VALUES (';
        }
        else {
            statement+=',';
        }
    }
    for (let j=0;j<values.length;j++) {
        if (values[j]?.toString().includes('width=device-width')) { statement+=`"${values[j]}"` }
        else { statement+=`'${values[j]}'` }
        if (j===values.length-1) {
            statement+=')';
        }
        else {
            statement+=',';
        }
    }
    return statement;
}
const sqlPromise = (q, queryErr, notFoundErr, connection) => {
    let con = connection === undefined ? connect() : connection;
    try {
        return new Promise((resolve, reject) => {
            con.query(q, function (err, result) {
                if (err) {console.log(err); reject(new Error(queryErr));}
                if (result !== undefined){resolve(result)}
                else {reject(new Error(notFoundErr))}
            });
        });
    }
    catch (e) {
        console.log(e);
        return {error: e};
    }
}
const connect = () => {
    return mysql.createConnection({
        host: process.env.dbHost,
        user: process.env.dbUser,
        password: process.env.dbPass,
        database: process.env.db,
        charset: 'utf8mb4'
    });
}
const errorCon = (err, con, res) => {
    if (err) {console.log(err);con.end();res.send({error:err})}
}
const pool = (multiple) => {
    return mysql.createPool({
        connectionLimit: 10, charset: 'utf8mb4', multipleStatements: multiple === true ? true : false,
        host: process.env.dbHost,user: process.env.dbUser,password: process.env.dbPass,database: process.env.db
    });
}
exports.insert = insertStmt;
exports.select = selectStmt;
exports.getPosts = getPosts;
exports.getBoosts = getBoosts;
exports.connect = connect;
exports.errorCon = errorCon;
exports.pool = pool;
exports.getUser = getUser;
exports.setUserProfile = setUserProfile;
exports.setUserSub = setUserSub;
exports.insertTx = insertTx;
exports.sqlPromise = sqlPromise;
exports.getReadability = getReadability;