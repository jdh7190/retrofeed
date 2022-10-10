const hcPost = async(payload, action, content) => {
    const r = await fetch('/hcPost', {
        method: 'post',
        body: JSON.stringify({
            hcauth: localStorage.hcauth,
            action,
            payload,
            content,
            handle: localStorage.paymail.split('@')[0]
        })
    });
    const res = await r.json();
    return res;
}
const getPosts = async (order, handle) => {
    let requestURL = `/getPosts/?order=${order}`;
    if (handle) { requestURL += `&handle=${handle}` }
    const res = await (await fetch(requestURL)).json();
    return res;
}
const getMyLikes = async createdDateTime => {
    const r = await fetch(`/myLikes`, {
        method: 'post',
        body: JSON.stringify({
            handle: localStorage.paymail.split('@')[0],
            createdDateTime
        })
    });
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
const getImage = async(url) => {
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