require('dotenv').config();
const express = require('express');
const sqlDB = require('./sqlDB');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const { Readability } = require('@mozilla/readability');
const { HandCashConnect } = require('@handcash/handcash-connect');
const handCashConnect = new HandCashConnect({appId: process.env.APP_ID, appSecret: process.env.APP_SECRET});
const JSDOM = require('jsdom').JSDOM;
const app = express(), port = process.env.SERVER_PORT;
app.use(express.static('public'));
app.use(express.json({type: ['application/json', 'text/plain'],limit:'50mb'}));
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
app.post('/hcaccount', async(req, res) => {
    if (req.body.hcauth) {
        try {
            const cloudAccount = handCashConnect.getAccountFromAuthToken(req.body.hcauth);
            let { publicProfile } = await cloudAccount.profile.getCurrentProfile();
            const { privateKey, publicKey } = await cloudAccount.profile.getEncryptionKeypair();
            const bsv = require('bsv');
            const bsvPublicKey = bsv.PublicKey.fromHex(publicKey);
            const address = bsv.Address.fromPublicKey(bsvPublicKey).toString();
            publicProfile.privateKey = privateKey;
            publicProfile.publicKey = publicKey;
            publicProfile.address = address;
            //console.log(`Encrypting...`, process.env.TEST_ENCRYPTION_KEY, 'to ', publicKey);
            //const encryptedEncryptionKey = ECIES.encrypt(process.env.TEST_ENCRYPTION_KEY, publicKey);
            const IES = require('bsv/ecies');
            const enc = new IES().publicKey(bsvPublicKey).encrypt(btoa(encodeURIComponent(process.env.TEST_ENCRYPTION_KEY)));
            const b64Enc = Buffer.from(enc).toString('base64');
            publicProfile.encryptedKey = b64Enc;
            const flds = ['paymail', 'publicKey', 'ownerAddress', 'handle', 'avatarURL', 'name'];
            const vls = [publicProfile.paymail, bsv.PublicKey.fromHex(publicKey).toHex(), address, publicProfile.handle, publicProfile.avatarUrl, publicProfile.displayName];
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
        const { content, txid, rawtx, handle, image } = payload;
        const flds = ['content', 'txid', 'rawtx', 'handle', 'imgs'];
        const vls = [content, txid, rawtx, handle, image || '']
        const stmt = sqlDB.insert('posts', flds, vls, true);
        const r = await sqlDB.sqlPromise(stmt, 'Failed to insert bPost.', '', pool);
        return r;
    } catch(e) {
        console.log(e);
        return {error:e}
    }
}
const likeTxIdx = async payload => {
    try {
        const { likedTxid, txid, rawtx, handle, likedHandle, emoji } = payload;
        const flds = ['likedTxid', 'txid', 'rawtx', 'handle', 'likedHandle', 'emoji'];
        const vls = [likedTxid, txid, rawtx, handle, likedHandle, emoji]
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
app.post('/hcPost', async(req, res) => {
    const { payload, action, hcauth, content, handle } = req.body;
    let description, likePayload, tipPayload;
    switch(action) {
        case 'post': description = `retrofeed ${action}`; break;
        case 'chat': description = `retrofeed ${action}💬`; break;
        case 'like':
            likePayload = content;
            description = `retrofeed ${action}${likePayload?.emoji}`;
            break;
        case 'tip':
            description = `retrofeed ${action}💰`;
            tipPayload = content;
            break;
        default: break;
    }
    try {
        const cloudAccount = handCashConnect.getAccountFromAuthToken(hcauth);
        const paymentParameters = { appAction: action, description }
        if (content.image) {
            const c = Buffer.from(content.image.split(',')[1], 'base64').toString('hex');
            payload[6] = c;
        }
        if (payload) {
            paymentParameters.attachment = { format: 'hexArray', value: payload }
        }
        if (likePayload?.likedHandle) {
            paymentParameters.payments = [
                { destination: likePayload.likedHandle, currencyCode: 'USD', sendAmount: 0.009 },
                { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: 0.001 }
            ]
        }
        if (tipPayload?.handle) {
            paymentParameters.payments = [
                { destination: tipPayload.tippedHandle, currencyCode: 'USD', sendAmount: tipPayload.amount*0.95 },
                { destination: '1KMSA5QxXHTTSj7PpNFRBCRJFQnCgtTwyU', currencyCode: 'USD', sendAmount: tipPayload.amount*0.05 }
            ]
        }
        const paymentResult = await cloudAccount.wallet.pay(paymentParameters);
        if (paymentResult.transactionId) {
            switch(action) {
                case 'post':
                    const postHandle = req.body.handle;
                    await bPostIdx({ content: content.text, image: content.image, handle: postHandle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex });
                    break;
                case 'like':
                    const { likedTxid, emoji, likedHandle } = likePayload;
                    await likeTxIdx({ likedTxid, handle: req.body.handle, txid: paymentResult.transactionId, rawtx: paymentResult.rawTransactionHex, emoji, likedHandle });
                    break;
                case 'chat':
                    break;
                case 'tip':
                    const { tippedHandle, txid, handle, amount } = tipPayload;
                    console.log()
                    await tipTxIdx({ tippedHandle, tippedTxid: txid, handle, txid: paymentResult.transactionId, amount });
                    break;
                default:
                    break;
            }
        }
        res.send({ paymentResult });
    }
    catch (error) { 
        console.log('HERE?',{error})
        if (error?.response) {
            console.log(error.response.data)
        }
        if (error.httpStatusCode === 413) {
            error.message = 'File upload image too large.';
        }
        res.send({error});
    }
})
app.get('/getPosts', async(req, res) => {
    try {
        const stmt = `SELECT posts.createdDateTime, posts.handle, posts.txid, content, users.name as username, users.avatarURL as icon, count(likes.id) as likeCount, imgs FROM retro.posts
            left outer join retro.likes on posts.txid = likes.likedTxid
            join retro.users on users.handle = posts.handle
        group by posts.id order by createdDateTime desc`;
        const r = await sqlDB.sqlPromise(stmt, 'Failed to register user.', '', pool);
        res.send(r);
    } catch (e) {
        console.log(e);
        res.send({error:'Failed to fetch from database.'});
    }
});
app.get('/myLikes', async(req, res) => {
    const { handle } = req.query;
    try {
        const stmt = `SELECT likedTxid from likes where handle = '${handle}'`;
        const r = await sqlDB.sqlPromise(stmt, `Failed to query likes for ${handle}`, 'No likes found.', pool);
        res.send(r)
    } catch(e) {
        console.log(e);
        res.send({error:e})
    }
})
app.get('/readability', async(req, res) => {
    try {
        if (!req.query.url) { res.send({ error: 'No URL specified.' }); return }
        const url = req.query.url;
        console.log({url})
        let result = await sqlDB.getReadability(pool, req.query.url);
        if (result?.length) {
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
    console.log(req.body)
    try {
        const r = await bPostIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted ${txid}!`) }
        res.sendStatus(200);
    } catch(e) {
        console.log({e});
        res.send({error: e});
    }
});
app.post('/likeTx', async(req, res) => {
    console.log(req.body)
    try {
        /* const r = await bPostIdx(req.body);
        if (r.affectedRows > 0) { console.log(`Inserted ${txid}!`) } */
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
app.listen(port, () => console.log(`Server listening on port ${port}...`));