const chatApp = new BSocial(APP);
var loadingPost = false, loadingText = '';
/* prof.src = localStorage?.icon ? localStorage.icon : '../assets/images/user.png'; */
const chatInput = document.getElementById('chatInput');
const chatBtn = document.getElementById('chatBtn');
const checkPost = () => {
    const input = chatInput.value;
    if (input !== "") {
        chatBtn.removeAttribute("disabled");
    } else {
        chatBtn.setAttribute("disabled", null);
    }
}
chatInput.onkeyup = e => {
    checkPost();
    if ((e.key === 'Enter' || e.keyCode === 13) && chatInput.value !== '') {
        postChat();
    }
}
const chatCon = document.getElementById('chatCon');
const section = document.getElementById('section');
const chatSound = new Audio();
chatSound.src = '../assets/sounds/get_heart.wav';
document.addEventListener("DOMContentLoaded", e => {
    chatSound.volume = 0.50;
})
const getChats = async() => {
    const chats = await (await fetch('/getChats')).json();
    chats.forEach(chat => {
        chat.paymail = `${chat.handle}@handcash.io`;
        if (chat.encrypted) {
            const m = decryptChatMsg(chat.text);
            chat.text = m;
        }
        addChatMsg(chat);
    })
    section.scrollIntoView(false)
}
const urlParams = new URLSearchParams(location.search);
const chatChannel = urlParams.get('c') || '';
var encryp = chatChannel?.includes('enc') || false;
getChats();
async function coinTip() {
    const tippedTxid = this.id;
    const paymail = this.dataset.paymail;
    tip(paymail, tippedTxid);
}
const addChatMsg = o => {
    const { icon, paymail, username, text, txid } = o;
    const row = document.createElement('div');
    row.className = 'row';
    const i = document.createElement('img');
    i.src = icon;
    i.className = 'chat-icon';
    const m = document.createElement('div');
    m.className = 'm';
    m.innerText = `${paymail}: ${text}`;
    const t = document.createElement('a');
    t.href = `https://whatsonchain.com/tx/${txid}`;
    t.target = '_blank';
    t.className = 't';
    const c = document.createElement('i');
    c.className = 'nes-icon coin is-small chat-coin';
    c.id = txid;
    c.dataset.paymail = paymail;
    c.onclick = coinTip;
    const date = new Date(o.createdDateTime);
    const month = date.getMonth() + 1;
    const year = date.getFullYear().toString().slice(-2);
    const dateDay = date.getDate();
    const hour = date.getHours();
    const minutes = date.getMinutes();;
    const mins = minutes < 10 ? `0${minutes}` : minutes;
    const seconds = date.getSeconds();
    const secs = seconds < 10 ? `0${seconds}` : seconds;
    t.innerText = ` ${month}/${dateDay}/${year}, ${hour}:${mins}:${secs}`;
    row.appendChild(i);
    row.appendChild(m);
    row.appendChild(t);
    row.appendChild(c)
    chatCon.appendChild(row);
    return row;
}
const chat = async(msg, channel, encrypt) => {
    const p = chatApp.post();
    encrypt = encryp;
    if (encrypt) {
        const encKey = decryptData(localStorage.encryptedKey, localStorage.ownerKey);
        msg = eciesEncrypt(msg, encKey);
        channel = 'osg_enc';
    }
    p.addText(msg);
    p.addMapData('paymail', localStorage.paymail);
    if (channel) {
        p.addMapData('context', 'channel');
        p.addMapData('channel', channel)
    } else { channel = '' }
    const arrops = p.getOps('utf8');
    let hexarr = [];
    arrops.forEach(a => { hexarr.push(str2Hex(a)) })
    const r = await hcPost(hexarr, 'chat', {
        text: msg,
        handle: localStorage.paymail.split('@')[0],
        username: localStorage.username,
        encrypted: encryp === true ? 1 : 0,
        channel: channel || ''
    });
    console.log({r});
}
const postChat = async() => {
    const obj = {
        icon: localStorage.icon,
        paymail: localStorage.paymail,
        username: localStorage.username,
        text: chatInput.value,
        createdDateTime: new Date()
    }
    addChatMsg(obj);
    chat(obj.text);
    chatInput.value = '';
    section.scrollIntoView(false);
}
const protocol = location.protocol.includes('https') ? 'wss' : 'ws';
const host = location.host.includes('localhost') ? `${location.hostname}:7777` : location.hostname;
const WS_URL = `${protocol}://${location.host}`;
const ws = new WebSocket(`${protocol}://${host}`);
ws.onopen = e => { console.log(`OPENED`, e) }
ws.onmessage = async e => {
    console.log(`MESSAGE`, e);
    const str = await e.data.text()
    const payload = JSON.parse(str);
    if (payload.handle !== localStorage.paymail.split('@')[0]) {
        addChatMsg(payload);
        section.scrollIntoView(false);
        chatSound.play();
    }
}
ws.onerror = e => {
    console.log(`WS ERROR`, e);
}
ws.onclose = e => {
    if (e.wasClean) {
        console.log(e.code, e.reason);
    }
}