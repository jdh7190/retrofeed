const fetch = require('node-fetch');
const { Readability } = require('@mozilla/readability');
const JSDOM = require('jsdom').JSDOM;
const sleep = timeout => { return new Promise(resolve => setTimeout(resolve, timeout)) }
const replaceAll = (str, find, replace) => { return str.replace(new RegExp(find, 'g'), replace) }
const readability = async url => {
    let r = await fetch(url);
    const data = await r.text();
    let doc = new JSDOM(data, { url });
    let article = new Readability(doc.window.document).parse();
    let baseURL = new URL(url);
    const host = baseURL.host.startsWith('www') ? baseURL.host.substr(4) : baseURL.host;
    let post = `<a href=${url} class="domain">${host}</a>
    <link href="../styles/read.css" rel="stylesheet">
    <h1>${article.title}</h1>
    ${article.byline ? `<div style="font-style: italic;">${article.byline}</div>` : ''}
    <hr>${article.content}`;
    post = replaceAll(post, "'", "''");
    return post;
}
const paymailAddr = async paymail => {
    const p = await fetch(`https://api.polynym.io/getAddress/${paymail}`);
    const { address } = await p.json();
    return address;
}
const getExchRate = async() => {
    const r = await fetch(`https://api.whatsonchain.com/v1/bsv/main/exchangerate`);
    const res = await r.json();
    return res;
}
const getPenny = async() => {
    const price = await getExchRate();
    return Math.ceil(1000000 / price.rate);
}
const extractUTXOs = (rawtx, addr) => {
    try {
        const tx = new bsv.Transaction(rawtx);
        let utxos = [], vout = 0;
        tx.outputs.forEach(output => {
            let satoshis = output.satoshis;
            let script = new bsv.Script.fromBuffer(output._scriptBuffer);
            if (script.isSafeDataOut()) { vout++; return }
            let pkh = bsv.Address.fromPublicKeyHash(script.getPublicKeyHash());
            let address = pkh.toString();
            if (address === addr) {
                utxos.push({satoshis, txid: tx.hash, vout, script: script.toHex()});
            }
            vout++;
        });
        return utxos;
    }
    catch(error) {
        console.log({error});
        return [];
    }
}
exports.sleep = sleep;
exports.readability = readability;
exports.replaceAll = replaceAll;
exports.getPenny = getPenny;
exports.paymailAddr = paymailAddr;