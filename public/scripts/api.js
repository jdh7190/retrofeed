const hcPost = async(payload, action, content) => {
    const r = await fetch('/hcPost', {
        method: 'post',
        body: JSON.stringify({
            hcauth: localStorage.hcauth,
            action,
            payload,
            content,
            handle: localStorage.paymail?.split('@')[0]
        })
    });
    const res = await r.json();
    return res;
}
const getPosts = async (order, handle) => {
    let requestURL = `/getPosts/?order=${order}`;
    if (handle) { requestURL += `&paymail=${handle}` }
    const res = await (await fetch(requestURL)).json();
    return res;
}
const getMyLikes = async createdDateTime => {
    const r = await fetch(`/myLikes`, {
        method: 'post',
        body: JSON.stringify({
            handle: localStorage.paymail?.split('@')[0],
            createdDateTime
        })
    });
    const res = await r.json();
    return res;
}
const getOrdLikes = async() => {
    const r = await fetch(`/ordLikes`, { method: 'post' });
    const res = await r.json();
    return res;
}
const getChatReactions = async createdDateTime => {
    const r = await fetch(`/chatReactions`, {
        method: 'post',
        body: JSON.stringify({ createdDateTime })
    });
    const res = await r.json();
    return res;
}
const bsvPrice = async set => {
    const res = await fetch(`https://api.whatsonchain.com/v1/bsv/main/exchangerate`);
    const jres = await res.json();
    if (set) { localStorage.rate = jres.rate }
    return jres;
}
const rawTransaction = async txid => {
    const r = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`);
    const raw = await r.text();
    return raw;
}
const getImage = async url => {
    let res = await fetch('/image', {
        method: 'post',
        headers: {  'content-type': 'application/json' },
        body: JSON.stringify({ url })
    });
    let jres = await res.json();
    return jres;
}
const getPenny = async() => {
    let price = await bsvPrice();
    let penny = parseFloat((Math.ceil(1000000 / price) / 100000000).toFixed(8));
    return penny;
}
const getRelayXRUNAddress = async handle => {
    try {
        let res = await fetch(`https://api.relayx.io/v1/paymail/run/${handle.toLowerCase()}`);
        let jres = await res.json();
        return jres?.data;
    }
    catch (e) { alert('Please enter a valid RelayX paymail!'); return '' }
}
const inscriptionNumber = async(txid, vout) => {
    try {
        const r = await fetch(`https://ordinals.gorillapool.io/api/inscriptions/origin/${txid}_${vout}`);
        const res = await r.json();
        if (res !== null) {
            return res[0].id;
        } else { throw `Error fetching inscription numbers.` }
    } catch(e) {
        console.log(e);
        return e;
    }
}
const bResolver = async txid => {
    try {
        const raw = await rawTransaction(txid);
        const bsvtx = bsv.Transaction(raw);
        const BOutput = bsvtx.outputs.find(out => out.satoshis === 0);
        return BOutput;
    } catch(e) {
        console.log(e);
    }
}
const getUserAvatar = async paymail => {
    const ua = await fetch(`/userAvatar`, {
        method: 'post',
        body: JSON.stringify({ paymail })
    })
    const { avatarURL } = await ua.json();
    return avatarURL;
}
const payForUserRawTx = async rawtx => {
    const r = await fetch(`/payForRawTx`, {
        method: 'post',
        body: JSON.stringify({rawtx})
    });
    const { paidRawTx } = await r.json();
    return paidRawTx;
}