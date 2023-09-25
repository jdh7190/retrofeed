const { JungleBusClient, ControlMessageStatusCode } = require('@gorillapool/js-junglebus');
const fetch = require('node-fetch');
require('dotenv').config();
const { idxTx } = require('./idxHelpers');
const API_URL = 'http://localhost:9003';
const server = "junglebus.gorillapool.io";
const mapSubId = process.env.MAP_SUBSCRIPTION;
const updateCrawl = async(height, hash) => {
    const r = await fetch(`${API_URL}/crawl`, {
        method: 'post',
        body: JSON.stringify({ height, hash })
    })
    const res = await r.text();
    console.log(res);
    return res;
}
const client = new JungleBusClient(server, {
    useSSL: true,
    debug: false,
    onConnected(ctx) { console.log("CONNECTED", ctx) },
    onConnecting(ctx) { console.log("CONNECTING", ctx) },
    onDisconnected(ctx) { console.log("DISCONNECTED", ctx) },
    onError(ctx) { console.error(ctx) },
});
const onPublish = async function(tx) {
    try {
        await idxTx(tx.transaction, tx.block_height, tx.block_time);
    } catch(e) { console.log(`Issue with txid ${tx.id}`, e) }
}
const onStatus = function(message) {
    if (message.statusCode === ControlMessageStatusCode.BLOCK_DONE) {
      console.log("BLOCK DONE", message.block);
      updateCrawl(message.block, message.block_hash);
    } else if (message.statusCode === ControlMessageStatusCode.WAITING) {
      console.log("WAITING FOR NEW BLOCK...");
    } else if (message.statusCode === ControlMessageStatusCode.REORG) {
      console.log("REORG TRIGGERED", message);
    } else if (message.statusCode === ControlMessageStatusCode.ERROR) {
      console.error(message);
    }
}
const onError = function(err) { console.error(err) }
const onMempool = async function(tx) {}
const main = async() => {
    try {
        const b = await fetch(`${API_URL}/crawl`);
        const bres = await b.json();
        const fromBlock = bres?.height || parseInt(process.env.BLOCK_HEIGHT);
        console.log(`FROM BLOCK: ${fromBlock}`);
        await client.Subscribe(mapSubId, fromBlock, onPublish, onStatus, onError, onMempool);
    } catch(e) {
        console.log({e})
    }
}
main()