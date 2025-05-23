require('dotenv').config();
const express = require('express');
const sqlDB = require('./sqlDB');
const helpers = require('./helpers');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const bsv = require('bsv');
const Message = require('bsv/message');
const { Readability } = require('@mozilla/readability');
const { HandCashConnect } = require('@handcash/handcash-connect');
const { payForRawTx } = require('./pay');
const handCashConnect = new HandCashConnect({appId: process.env.APP_ID, appSecret: process.env.APP_SECRET});
const JSDOM = require('jsdom').JSDOM;
const app = express(), port = process.env.SERVER_PORT;
const WebSocket = require('ws');
const chatPort = 7777;
const wss = new WebSocket.Server({ port: chatPort });
const clients = new Map();
wss.on('listening', () => {
    console.log(`WSS Listening on port ${chatPort}...`)
})
wss.on('connection', ws => {
    const id = Math.floor(Math.random()*10000);
    clients.set(ws, id);
    ws.on('close', () => {
        clients.delete(ws);
    })
});
app.use(express.static('public'));
app.use(express.json({type:['application/json', 'text/plain'], limit:'50mb'}));
app.use(express.urlencoded({extended:true, limit:'50mb'}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type");
    next();
});
app.use(express.text({limit:'50mb'}))
var pool = sqlDB.pool(true);
app.get('/', (req, res) => {res.sendFile('index.html', { root: __dirname })});
app.get('/getBoosts', async(req, res) => {
    try {
        sqlDB.getBoosts(pool).then(async(result) => {
            res.send(result);
        }).catch(err => { console.log('Caught error in getBoosts: ',err);
            res.send({error: "Error querying for boosts."})
        });
    } catch (e) {
        console.log(e); res.send({error:'Failed to fetch from database.'});
    }
});
app.get('/crawl', async(req, res) => {
    try {
        const stmt = `SELECT height, hash from crawl LIMIT 1`;
        const r = await sqlDB.sqlPromise(stmt, '', 'No record in crawl found.', pool);
        if (r?.length) {
            res.send(r[0]);
        } else { throw `Error querying crawl table.` }
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.post('/crawl', async(req, res) => {
    const { height, hash } = req.body;
    try {
        const stmt = `UPDATE crawl set height = '${height}' where id = '1'`;
        const r = await sqlDB.sqlPromise(stmt, 'Error inserting into crawl.', 'No record in crawl found.', pool);
        if (r.affectedRows > 0) {
            console.log(`Updated height ${height}.`);
        }
        res.sendStatus(200);
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.post('/hcaccount', async(req, res) => {
    if (req.body.hcauth) {
        try {
            const cloudAccount = handCashConnect.getAccountFromAuthToken(req.body.hcauth);
            let { publicProfile } = await cloudAccount.profile.getCurrentProfile();
            const { privateKey, publicKey } = await cloudAccount.profile.getEncryptionKeypair();
            const bsvPublicKey = bsv.PublicKey.fromHex(publicKey);
            const address = bsv.Address.fromPublicKey(bsvPublicKey).toString();
            publicProfile.privateKey = privateKey;
            publicProfile.publicKey = publicKey;
            publicProfile.address = address;
            /* const IES = require('bsv/ecies');
            const enc = new IES().publicKey(bsvPublicKey).encrypt(btoa(encodeURIComponent(process.env.TEST_ENCRYPTION_KEY)));
            const b64Enc = Buffer.from(enc).toString('base64');
            publicProfile.encryptedKey = b64Enc; */
            const flds = ['paymail', 'publicKey', 'ownerAddress', 'handle', 'avatarURL', 'name'];
            const vls = [publicProfile.paymail, bsv.PublicKey.fromHex(publicKey).toHex(), address, publicProfile.handle, publicProfile.avatarUrl, helpers.replaceAll(publicProfile.displayName, "'", "''")];
            const stmt = sqlDB.insert('users', flds, vls, true);
            const r = await sqlDB.sqlPromise(stmt, 'Failed to register user.', '', pool);
            if (r.affectedRows > 0) { console.log(`Registered user ${publicProfile.paymail}!`) }
            res.send({ publicProfile });
        } catch (error) {
            console.log({error})
            res.send({ error });
        }
    }
    else {
        res.send({ error: 'No profile found.' });
    }
});
const bPostIdx = async payload => {
    try {
        const { content, txid, rawtx, handle, image, app, context, jig, paymail, club } = payload;
        const flds = ['content', 'txid', 'rawtx', 'handle', 'imgs', 'app', 'context', 'jig', 'paymail', 'club', 'blocktime'];
        const contentText = helpers.replaceAll(content, "'", "''");
        let blocktime = payload?.blocktime > 0 ? payload.blocktime : Math.floor(Date.now() / 1000);
        const vls = [contentText, txid, rawtx, handle, image || '', app, context || '', jig || '', paymail, club || '', blocktime]
        const stmt = sqlDB.insert('posts', flds, vls, true);
        const r = await sqlDB.sqlPromise(stmt, 'Failed to insert bPost.', '', pool);
        return r;
    } catch(e) {
        console.log(e);
        return {error:e}
    }
}
const getReplyHandle = async txid => {
    const repliedStmt = `SELECT handle from retro.posts where txid = '${txid}'`;
    const rs = await sqlDB.sqlPromise(repliedStmt, 'Error querying for replied handle.', `No handle found for ${txid}.`, pool);
    return rs[0]?.handle;
}
const replyIdx = async payload => {
    try {
        const { content, txid, rawtx, handle, image, replyTxid } = payload;
        const flds = ['content', 'txid', 'rawtx', 'handle', 'imgs', 'repliedTxid', 'repliedHandle', 'blocktime'];
        const contentText = helpers.replaceAll(content, "'", "''");
        let replyHandle = payload?.replyHandle;
        let blocktime = payload?.blocktime > 0 ? payload.blocktime : Math.floor(Date.now() / 1000);
        if (!replyHandle || replyHandle === null) {
            replyHandle = await getReplyHandle(replyTxid);
        }
        const vls = [contentText, txid, rawtx, handle, image || '', replyTxid, replyHandle || '', blocktime];
        const stmt = sqlDB.insert('replies', flds, vls, true);
        const r = await sqlDB.sqlPromise(stmt, 'Failed to insert replies.', '', pool);
        return r;
    } catch(e) {
        console.log(e);
        return {error:e}
    }
}
const chatIdx = async payload => {
    try {
        const { text, txid, rawtx, handle, username, encrypted, channel, app, signingAddress, signature, blocktime } = payload;
        const flds = ['text', 'txid', 'rawtx', 'handle', 'username', 'encrypted', 'channel', 'app', 'signingAddress', 'signature', 'blocktime'];
        const contentText = helpers.replaceAll(text, "'", "''");
        const insChannel = helpers.replaceAll(channel, "'", "''");
        let user = '';
        if (username) {
            user = helpers.replaceAll(username, "'", "''")
        }
        const vls = [contentText, txid, rawtx, handle, user || '', encrypted, insChannel, app || '', signingAddress || '', signature || '', blocktime]
        const stmt = sqlDB.insert('chats', flds, vls, true);
        const r = await sqlDB.sqlPromise(stmt, 'Failed to insert bPost.', '', pool);
        if (r?.insertId && r.affectedRows > 0) {
            const selectStmt = `SELECT chats.txid, chats.text, chats.handle, chats.blocktime, chats.app, chats.createdDateTime, channel, encrypted, users.avatarURL as icon, users.paymail FROM retro.chats
                left outer join retro.users on users.handle = chats.handle OR users.paymail = chats.handle
            where chats.id = ${r.insertId}
            group by handle`;
            const chat = await sqlDB.sqlPromise(selectStmt, 'Failed to get newly inserted chat.', '', pool);
            if (chat.length) {
                wss.clients.forEach(client => {
                    if (client !== wss && client.readyState === WebSocket.OPEN) {
                        client.send(Buffer.from(JSON.stringify(chat[0])));
                    }
                })
            }
        }
        return r;
    } catch(e) {
        console.log(e);
        return {error:e}
    }
}
const likeTxIdx = async payload => {
    try {
        const { likedTxid, txid, rawtx, handle, likedHandle, emoji, hexcode } = payload;
        const flds = ['likedTxid', 'txid', 'rawtx', 'handle', 'likedHandle', 'emoji', 'hexcode'];
        const vls = [likedTxid, txid, rawtx, handle || '', likedHandle || '', emoji || '', hexcode || '']
        const stmt = sqlDB.insert('likes', flds, vls, true);
        const r = await sqlDB.sqlPromise(stmt, 'Failed to insert like.', '', pool);
        return r;
    } catch(e) {
        console.log(e);
        return {error:e}
    }
}
const tipTxIdx = async payload => {
    try {
        const { tippedHandle, handle, txid, tippedTxid, amount } = payload;
        const flds = ['tippedHandle', 'handle', 'txid', 'tippedTxid', 'amount'];
        const vls = [tippedHandle, handle, txid, tippedTxid, amount];
        const stmt = sqlDB.insert('tips', flds, vls, true);
        return await sqlDB.sqlPromise(stmt, 'Failed to insert tip.', '', pool);
    } catch(e) {
        console.log(e);
        return {error:e}
    }
}
const bsvPrice = async() => {
    const res = await fetch(`https://api.whatsonchain.com/v1/bsv/main/exchangerate`);
    const jres = await res.json();
    return jres.rate;
}
const getAIPMessageBuffer = opReturn => {
    const buffers = [];
    if (opReturn[0].replace('0x', '') !== '6a') {
      buffers.push(Buffer.from('6a', 'hex'));
    }
    opReturn.forEach((op) => { buffers.push(Buffer.from(op.replace('0x', ''), 'hex')) });
    buffers.push(Buffer.from('|'));
    return Buffer.concat([...buffers]);
  }
const signPayload = (key, payload) => {
    const bsvPrivateKey = bsv.PrivateKey.fromWIF(key);
    const msgbuf = getAIPMessageBuffer(payload);
    const signature = Message(msgbuf).sign(bsvPrivateKey);
    /* const v = Message.verify(msgbuf, '1GZ8kkztZbAuLr2Hq2Lk8mcuP8wKgcxP4J', signature);
    console.log(v) */
    return signature;
}
app.post('/priceRequest', async(req, res) => {
    const { channel, action, content, hcauth, encrypted, symbol } = req.body;
    const handle = 'morninrun';
    const morninPostingKey = 'L2bo8pabyHj94LmaPt95ZHwEQiffDFs4ZhsvAKBCVL8fj2PSM76Q';
    const morninSigningAddress = '1GZ8kkztZbAuLr2Hq2Lk8mcuP8wKgcxP4J';
    const r = await (await fetch(`https://mornin.run/tokenPrice?symbol=${symbol}`)).json();
    const displaySymbol = symbol.toUpperCase();
    const text = `${displaySymbol} Price: ${displaySymbol === 'BSV' ? '$' + r.price.toFixed(2) : r.satoshiPrice + ' satoshis'}`;
    let pay = [
        '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut',
        text,
        'text/markdown',
        'UTF-8',
        '|',
        '1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5',
        'SET',
        'app',
        'retrofeed.me',
        'type',
        'message',
        'paymail',
        'morninrun@handcash.io'
    ], hexarr = [], payhex = [];
    if (channel) { pay = pay.concat('context', 'channel', 'channel', channel) }
    pay.forEach(p => { payhex.push(Buffer.from(p).toString('hex')) });
    const signature = signPayload(morninPostingKey, payhex);
    pay = pay.concat(['|', '15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva', 'BITCOIN_ECDSA', morninSigningAddress, signature]);
    pay.forEach(p => { hexarr.push(Buffer.from(p).toString('hex')) });
    if (action === 'chat') {
        try {
            const cloudAccount = handCashConnect.getAccountFromAuthToken(hcauth);
            const paymentParameters = { appAction: action, description: 'Price Request 📰📈' }
            paymentParameters.attachment = { format: 'hexArray', value: hexarr };
            paymentParameters.payments = [{ destination: 'morninrun', currencyCode: 'BSV', sendAmount: 0.000001 }];
            const paymentResult = await cloudAccount.wallet.pay(paymentParameters);
            if (paymentResult.transactionId) {
                switch(action) {
                    case 'chat':
                        await chatIdx({ text, handle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex, username: `THE MORNIN' RUN`, encrypted, channel, blocktime: Math.floor(Date.now() / 1000) })
                        break;
                    default:
                        break;
                }
            }
            res.send({ paymentResult });
        } catch(e) {
            console.log(e);
            res.send({error:e})
        }
    }
})
app.post('/hcPost', async(req, res) => {
    const { payload, action, hcauth, content, handle } = req.body;
    let description, likePayload, tipPayload, chatPayload, replyPayload, postPayload;
    switch(action) {
        case 'post': 
            description = `${action}`;
            postPayload = content;
            break;
        case 'reply':
            description = `${action} ↩️`;
            replyPayload = content;
            break;
        case 'chat': 
            description = `retrofeed ${action} 💬`;
            chatPayload = content;
            break;
        case 'like':
            likePayload = content;
            description = `${action} ${likePayload?.emoji}`;
            break;
        case 'emoji reaction':
            likePayload = content;
            description = `${action} ${likePayload?.emoji}`;
            break;
        case 'tip':
            description = `${action} 💰`;
            tipPayload = content;
            break;
        default: break;
    }
    try {
        const cloudAccount = handCashConnect.getAccountFromAuthToken(hcauth);
        const paymentParameters = { appAction: action, description }
        if (content?.image) {
            const c = Buffer.from(content.image.split(',')[1], 'base64').toString('hex');
            payload[6] = c;
        }
        if (payload) {
            paymentParameters.attachment = { format: 'hexArray', value: payload }
        }
        if (postPayload?.mentions?.length) {
            paymentParameters.payments = [];
            postPayload.mentions.forEach(mention => {
                paymentParameters.payments.push({ destination: mention, currencyCode: 'USD', sendAmount: 0.005 })
            })
            paymentParameters.payments.push({ destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: 0.001 });
        }
        if (replyPayload?.replyTxid) {
            const replyHandle = await getReplyHandle(replyPayload.replyTxid);
            const rHandle = replyHandle.substring(0,1) === '1' && replyHandle.length < 26 ? `${replyHandle.slice(1)}@relayx.io` : replyHandle;
            replyPayload.replyHandle = rHandle;
            paymentParameters.payments = [
                { destination: rHandle, currencyCode: 'USD', sendAmount: 0.009 },
                { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: 0.001 }
            ]
        }
        if (likePayload?.likedHandle) {
            if (action === 'emoji reaction') {
                paymentParameters.payments = [
                    { destination: likePayload.likedHandle, currencyCode: 'BSV', sendAmount: 0.000009 },
                    { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'BSV', sendAmount: 0.000001 }
                ]
            } else {
                if (likePayload?.likedTxid.includes('ord://')) {
                    paymentParameters.payments = [
                        { destination: likePayload.likedHandle, currencyCode: 'USD', sendAmount: 0.0009 },
                        { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: 0.0001 }
                    ]
                } else {
                    paymentParameters.payments = [
                        { destination: likePayload.likedHandle, currencyCode: 'USD', sendAmount: 0.009 },
                        { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: 0.001 }
                    ]
                }
            }
        }
        if (tipPayload?.handle) {
            paymentParameters.payments = [
                { destination: tipPayload.tippedHandle, currencyCode: 'USD', sendAmount: tipPayload.amount*0.99 },
                { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: tipPayload.amount*0.01 }
            ]
        }
        if (chatPayload?.mentions?.length) {
            paymentParameters.payments = [];
            chatPayload.mentions.forEach(mention => {
                paymentParameters.payments.push({ destination: mention, currencyCode: 'USD', sendAmount: 0.005 })
            })
            paymentParameters.payments.push({ destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: 0.001 });
        }
        const paymentResult = await cloudAccount.wallet.pay(paymentParameters);
        if (paymentResult.transactionId) {
            const postHandle = req.body.handle;
            switch(action) {
                case 'post':
                    await bPostIdx({ content: content.text, image: content.image, handle: postHandle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex, app: 'retrofeed.me', paymail: `${postHandle}@handcash.io` });
                    break;
                case 'reply':
                    await replyIdx({
                        content: content.text,
                        image: content.image,
                        handle: postHandle,
                        txid: paymentResult.transactionId,
                        rawtx: paymentResult.rawTransactionHex,
                        replyTxid: content.replyTxid,
                        replyHandle: replyPayload.replyHandle
                    });
                    break;
                case 'like':
                case 'emoji reaction':
                    let { likedTxid, emoji, likedHandle, hexcode } = likePayload;
                    await likeTxIdx({ likedTxid, handle: req.body.handle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex, emoji, likedHandle, hexcode });
                    break;
                case 'chat':
                    const { text, username, encrypted, channel, blocktime } = chatPayload;
                    await chatIdx({ text, handle: req.body.handle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex, username, encrypted, channel, blocktime })
                    break;
                case 'tip':
                    const { tippedHandle, txid, handle, amount } = tipPayload;
                    await tipTxIdx({ tippedHandle, tippedTxid: txid, handle, txid: paymentResult.transactionId, amount });
                    break;
                default:
                    break;
            }
        }
        res.send({ paymentResult });
    }
    catch (error) { 
        console.log({error})
        if (error?.response) {
            console.log(error.response.data)
        }
        if (error.httpStatusCode === 413) {
            error.message = 'File upload image too large.';
        }
        res.send({error});
    }
})
app.post('/rain', async(req, res) => {
    const { payload, action, hcauth, satoshis, content } = req.body;
    const description = `Chat /rain 🌧`;
    const { text, username, encrypted, channel, blocktime, handles, handle } = content;
    try {
        const cloudAccount = handCashConnect.getAccountFromAuthToken(hcauth);
        const paymentParameters = { appAction: action, description }
        if (payload) {
            paymentParameters.attachment = { format: 'hexArray', value: payload }
        }
        if (handles?.length) {
            paymentParameters.payments = [];
            handles.forEach(mention => {
                paymentParameters.payments.push({ destination: mention, currencyCode: 'BSV', sendAmount: satoshis })
            })
            paymentParameters.payments.push({ destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'BSV', sendAmount: satoshis });
        }
        const paymentResult = await cloudAccount.wallet.pay(paymentParameters);
        if (paymentResult.transactionId) {
            res.send({paymentResult});
            await chatIdx({ text, handle: content.handle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex, username, encrypted, channel, blocktime })
        }
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.get('/getPosts', async(req, res) => {
    const { order, paymail } = req.query;
    let orderBy;
    if (order === '0') { orderBy = 'blocktime desc, posts.id desc' }
    else if (order === '1') { orderBy = 'likeCount desc' }
    else if (order === '2') { orderBy = 'satoshis desc' }
    else if (order === '3') { orderBy = 'posts.lockHeight desc' }
    else { orderBy = 'replyCount desc' }
    let paymailClause = '';
    if (paymail?.includes('@')) {
        paymailClause = paymail ? ('where posts.paymail = ' + "'" + paymail + "'") : '';
    } else if (paymail?.length > 0) {
        paymailClause = `where posts.paymail LIKE '%${paymail}%'`;
    }
    try {
        const stmt = `SELECT posts.createdDateTime, posts.blocktime, posts.handle, posts.paymail, posts.txid, posts.content, users.name as username, users.avatarURL as icon, count(likes.id) as likeCount, posts.imgs, posts.paymail, sum(likes.satoshis) as satoshis, posts.satoshis as postSatoshis FROM retro.posts
            left outer join retro.likes on posts.txid = likes.likedTxid
            left outer join retro.users on users.paymail = posts.paymail
        ${paymailClause}
        group by posts.id
        order by ${orderBy} LIMIT 50`;
        const r = await sqlDB.sqlPromise(stmt, 'Failed to query for posts.', 'No posts found.', pool);
        const rStmt = `SELECT count(replies.id) as replyCount, posts.txid FROM retro.posts
            left outer join retro.replies on posts.txid = replies.repliedTxid
            where replies.blocktime >= ${r[r.length-1]?.blocktime || 0}
        group by posts.id`;
        const rs = await sqlDB.sqlPromise(rStmt, '', '', pool);
        const replies = rs.filter(reply => reply.replyCount > 0);
        replies.forEach(reply => {
            const found = r.findIndex(x => x.txid === reply.txid);
            if (found > -1) {
                r[found].replyCount = reply.replyCount;
            }
        })
        res.send(r);
    } catch (e) {
        console.log(e);
        res.send({error:'Failed to fetch from database.'});
    }
});
app.get('/getChats', async(req, res) => {
    const { c } = req.query;
    try {
        const stmt = `SELECT chats.txid, text, chats.handle, chats.blocktime, username, users.avatarURL as icon, channel, chats.createdDateTime, users.paymail as paymail FROM retro.chats
            left outer join retro.users on users.handle = chats.handle OR users.paymail = chats.handle
        where encrypted = 0
        ${c ? `and channel = '${c}'` : 'and channel = ""'}
        order by chats.blocktime desc, chats.id desc LIMIT 50`;
        const r = await sqlDB.sqlPromise(stmt, 'Failed to query chats.', '', pool);
        res.send(r);
    } catch (e) {
        console.log(e);
        res.send({error:'Failed to fetch from database.'});
    }
});
app.get('/channels', async(req, res) => {
    try {
        const stmt = `SELECT channel, count(chats.id) as count FROM retro.chats 
            where channel != ''
            group by channel
            order by count desc`;
        const r = await sqlDB.sqlPromise(stmt, 'Failed to query channels', '', pool);
        res.send(r);
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.get('/getPost', async(req, res) => {
    const { txid } = req.query;
    try {
        const stmt = `SELECT posts.createdDateTime, posts.handle, posts.txid, content, users.name as username, users.avatarURL as icon, count(likes.id) as likeCount, imgs, posts.paymail, posts.blocktime, (coalesce(posts.satoshis, 0) + coalesce(sum(likes.satoshis), 0)) as satoshis FROM retro.posts
            left outer join retro.likes on posts.txid = likes.likedTxid
            left outer join retro.users on users.handle = posts.handle
        where posts.txid = '${req.query.txid}'
        group by posts.id order by createdDateTime desc`;
        const r = await sqlDB.sqlPromise(stmt, `Failed to get post for txid ${txid}.`, `No post for txid ${txid}.`, pool);
        const replyStmt = `SELECT replies.txid, replies.handle, content, imgs, replies.createdDateTime, count(likes.id) as likeCount, users.name as username, users.avatarURL as icon, users.paymail as userPaymail, replies.paymail as paymail, (coalesce(replies.satoshis, 0) + coalesce(sum(likes.satoshis), 0)) as satoshis FROM retro.replies
            left outer join retro.likes on replies.txid = likes.likedTxid
            left outer join retro.users on retro.users.handle = replies.handle
            where repliedTxid = '${txid}'
            group by replies.id
            order by likeCount asc`;
        const rs = await sqlDB.sqlPromise(replyStmt, `Failed to get replies for ${txid}.`, `No replies for txid ${txid}.`, pool);
        res.send({ post: r, replies: rs});
    } catch (e) {
        console.log(e);
        res.send({error:'Failed to fetch from database.'});
    }
});
app.post('/myLikes', async(req, res) => {
    const { handle, createdDateTime } = req.body;
    try {
        const stmt = `SELECT likedTxid from likes where handle = '${handle}' and createdDateTime >= '${createdDateTime}' and hexcode = '2665'`;
        const r = await sqlDB.sqlPromise(stmt, `Failed to query likes for ${handle}`, 'No likes found.', pool);
        res.send(r);
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.post('/ordLikes', async(req, res) => {
    try {
        const stmt = `SELECT count(id) as numLikes, substring(likedTxid, 7, 69) as likedOrd from retro.likes where likes.likedTxid like '%ord://%' group by likedTxid order by numLikes desc`;
        const r = await sqlDB.sqlPromise(stmt, `Failed to query ordinal likes.`, 'No ordinal likes found.', pool);
        res.send(r);
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.post('/chatReactions', async(req, res) => {
    const { createdDateTime } = req.body;
    try {
        const stmt = `select likedTxid, id, handle, emoji, hexcode from retro.likes
            where createdDateTime >= '${createdDateTime}'
            AND hexcode is not NULL`;
        const r = await sqlDB.sqlPromise(stmt, 'Failed to query likes for chats.', 'No likes found.', pool);
        res.send(r);
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.get('/readability', async(req, res) => {
    try {
        if (!req.query.url) { res.send({ error: 'No URL specified.' }); return }
        const url = req.query.url;
        let result = await sqlDB.getReadability(pool, req.query.url);
        if (result[0]?.readability) {
            res.send(`<meta name="viewport" content="width=device-width, initial-scale=1.0">${result[0].readability}`);
            return;
        }
        let r = await fetch(url);
        const data = await r.text();
        let doc = new JSDOM(data, { url: req.query.url });
        let article = new Readability(doc.window.document).parse();
        let baseURL = new URL(req.query.url);
        const domain = baseURL.host.startsWith('www') ? baseURL.host.substring(4) : baseURL.host;
        res.send(`
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="../styles/read.css" rel="stylesheet">
            <div class="header-bar"></div>
            <h3>${article.title}</h3>
            ${article.byline ? `<div class="byline">by ${article.byline} <a class="byline" href=${req.query.url} class="domain">${domain}</a></div>` : ''}
            <hr>
            ${article.content}
            <script src="../scripts/readability.js"></script>
        `);
    } catch (error) { console.log(error); res.send({error}) }
});
app.post('/bPost', async(req, res) => {
    try {
        const { txid } = req.body;
        const r = await bPostIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted bPost: ${txid}!`) }
        res.sendStatus(200);
    } catch(e) {
        console.log({e});
        res.send({error: e});
    }
});
app.post('/bReply', async(req, res) => {
    try {
        const { txid } = req.body;
        const r = await replyIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted reply: ${txid}!`) }
        res.sendStatus(200);
    } catch(e) {
        console.log({e});
        res.send({error: e});
    }
});
app.post('/likeTx', async(req, res) => {
    const {txid} = req.body;
    try {
        const r = await likeTxIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted like txid: ${txid}!`) }
        res.sendStatus(200);
    } catch(e) {
        console.log({e});
        res.send({error: e});
    }
});
app.post('/tipTx', async(req, res) => {
    const {txid} = req.body;
    try {
        const r = await tipTxIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted tip txid: ${txid}!`) }
        res.sendStatus(200);
    } catch(e) {
        console.log({e});
        res.send({error: e});
    }
});
app.post('/chatTx', async(req, res) => {
    const {txid} = req.body;
    try {
        const r = await chatIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted chat txid: ${txid}!`) }
        res.sendStatus(200);
    } catch(e) {
        console.log({e});
        res.send({error: e});
    }
});
app.post('/image', async(req, res) => {
    try {
        let r = await fetch(req.body.url);
        const data = await r.text();
        $ = cheerio.load(data);
        let ogImage = $('meta[property="og:image"]').attr('content');
        res.send({ogImage});
    }
    catch (e) {
        console.log({e});
        res.send({error:'Failed to fetch image for url.'})
    }
})
app.post('/userAvatar', async(req, res) => {
    if (req.body.paymail) {
        try {
            const stmt = `SELECT avatarURL from users where paymail = '${req.body.paymail}' LIMIT 1`;
            const r = await sqlDB.sqlPromise(stmt, '', `No record for ${req.body.paymail} in users found.`, pool);
            if (r?.length) {
                res.send(r[0]);
            } else { throw `Error querying users table.` }
        } catch (error) {
            console.log({error})
            res.send({ error });
        }
    } else { res.send({ error: 'No profile found.' }) }
})
app.post('/walletAccount', async(req, res) => {
    if (req.body.address) {
        try {
            const flds = ['paymail', 'publicKey', 'ownerAddress', 'handle', 'avatarURL', 'name'];
            const vls = [req.body.address, req.body.publicKey, req.body.ownerAddress, req.body?.handle || req.body.address, req.body.avatarURL, req.body?.username || req.body.address];
            const stmt = sqlDB.insert('users', flds, vls, true);
            const r = await sqlDB.sqlPromise(stmt, 'Failed to register user.', '', pool);
            if (r.affectedRows > 0) { console.log(`Registered user ${req.body.address}!`) }
            res.send({ success: true });
        } catch (error) {
            console.log({error})
            res.send({ error });
        }
    } else { res.send({ error: 'No profile found.' }) }
});
app.post('/outputTemplate', async(req, res) => {
    const { outputs } = req.body;
    try {
        const penny = await helpers.getPenny();
        const bsvtx = bsv.Transaction();
        for (let output of outputs) {
            const amount = output?.amount ? parseInt(output.amount*penny*100) : output.satoshis;
            if (output.to.includes('@')) {
                const address = await helpers.paymailAddr(output.to);
                bsvtx.to(address, amount);
            } else { bsvtx.to(output.to, amount) }
        }
        res.send({rawtx:bsvtx.toString()})
    } catch(e) {
        console.log(e);
        res.send({error:e});
    }
})
app.post('/payForRawTx', async(req, res) => {
    try {
        const { rawtx } = req.body;
        const paidRawTx = await payForRawTx(rawtx);
        res.send({paidRawTx})
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.get('/mysqldump', async(req, res) => {
    const file = `./dump/Dump20231017.sql`;
    res.download(file);
})
app.listen(port, () => console.log(`Server listening on port ${port}...`));