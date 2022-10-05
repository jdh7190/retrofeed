const chatApp = new BSocial(APP);
var loadingPost = false, loadingText = '', reactions = [];
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
        if (!localStorage.hcauth) { 
            location.href = '/profile';
            return;
        }
        postChat();
    }
}
const chatCon = document.getElementById('chatCon');
const section = document.getElementById('section');
const chatSound = new Audio();
chatSound.src = '../assets/sounds/get_heart.wav';
const pickupCoin = new Audio();
pickupCoin.src = '../assets/sounds/pickupCoin.wav';
document.addEventListener("DOMContentLoaded", e => {
    chatSound.volume = 0.50;
    pickupCoin.volume = 0.25;
});
var setOfHandles = [];
const getChats = async() => {
    const q = chatChannel ? `/getChats/?c=${chatChannel}` : '/getChats'
    const chats = await (await fetch(q)).json();
    console.log(chats)
    const handlesSet = new Set(chats.map(c => {
        return !c?.handle.includes('@') ? `${c.handle}@handcash.io` : c.handle;
    }));
    setOfHandles = Array.from(handlesSet);
    console.log(setOfHandles)
    if (chats?.length) {
        const idx = chats.length - 1;
        reactions = await getChatReactions(chats[idx].createdDateTime);
        for (let i = idx; i > -1; i--) {
            chats[i].paymail = chats[i].paymail || chats[i].handle;
            if (chats[i].encrypted) {
                const m = decryptChatMsg(chats[i].text);
                chats[i].text = m;
            }
            addChatMsg(chats[i]);
        }
    }
    section.scrollIntoView(false)
}
const urlParams = new URLSearchParams(location.search);
const chatChannel = urlParams.get('c') || '';
if (chatChannel) { document.getElementById('chat-title').innerText = chatChannel }
var encryp = false;
getChats();
async function coinTip() {
    const tippedTxid = this.id;
    const paymail = this.dataset.paymail;
    tip(paymail, tippedTxid);
}
const emojiLike = async(emoji, hexcode, txid, handle) => {
    const l = chatApp.like(txid, emoji);
    const arrops = l.getOps('utf8');
    let hexarrops = ['6a'];
    arrops.forEach(o => { hexarrops.push(str2Hex(o)) })
    hexarrops.push('7c');
    const b2sign = hexArrayToBSVBuf(hexarrops);
    const bsvPrivateKey = bsv.PrivateKey.fromWIF(localStorage.ownerKey);
    const signature = bsvMessage.sign(b2sign.toString(), bsvPrivateKey);
    const payload = arrops.concat(['|', AIP_PROTOCOL_ADDRESS, 'BITCOIN_ECDSA', localStorage.ownerAddress, signature]);
    let hexarr = [];
    payload.forEach(p => { hexarr.push(str2Hex(p)) })
    const likePayload = { emoji, likedTxid: txid, likedHandle: handle, hexcode }
    const p = await hcPost(hexarr, 'emoji reaction', likePayload);
    console.log(p);
    pickupCoin.play();
}
const customEmojis = [
    {
        emoji: 'SHUA',
        label: 'SHUACoin',
        url: '/assets/images/shua.png',
        tags: ['bsv', 'token', 'shua'],
        data: { id: 719 }
    }
]
async function pickEmoji() {
    if (!localStorage.hcauth) { 
        location.href = '/profile';
        return;
    }
    const reactedTxid = this.id;
    const handle = this.dataset.handle;
    const trigger = this;
    const picker = picmoPopup.createPopup({ theme: 'dark', custom: customEmojis }, { referenceElement: trigger, triggerElement: trigger })
    picker.open();
    picker.addEventListener('emoji:select', e => {
        try {
            console.log(e)
            const es = document.getElementById(`${reactedTxid}_es`);
            const hexcode = e?.hexcode || e?.url;
            const found = emojiExists(es, e.hexcode);
            if (found) {
                incReaction(found);
            } else {
                es.appendChild(addReaction(e.emoji, hexcode));
                emojiLike(e.emoji, hexcode, reactedTxid, handle);
            }
        } catch(e) {
            console.log(e);
            alert(e);
        }
    })
}
async function incReaction(el) {
    if (!localStorage.hcauth) { 
        location.href = '/profile';
        return;
    }
    try {
        const elem = this?.id ? this : el;
        const parentTxid = elem.parentElement?.id.slice(0,64);
        const emoji = elem.innerText.split(' ')[0];
        const handle = elem.parentElement.dataset.handle;
        let count = parseInt(elem.innerText.split(' ')[1])+1;
        elem.innerText = `${emoji} ${count}`;
        emojiLike(emoji, this.id, parentTxid, handle);
    } catch(e) {
        console.log(e);
        alert(e);
    } 
}
const addReaction = (emoji, hexcode) => {
    const reaction = document.createElement('div');
    reaction.className = 'reacted';
    reaction.id = hexcode;
    reaction.innerHTML = `${emoji} 1`;
    reaction.onclick = incReaction;
    return reaction;
}
const emojiExists = (parent, hexcode) => {
    const arr = Array.from(parent.children);
    const found = arr.find(a => a.id === hexcode);
    return found;
}
const addEphemeralMsg = text => {
    const row = document.createElement('div');
    row.className = 'row';
    const i = document.createElement('img');
    i.src = '../assets/images/icon_192_noback.png';
    i.className = 'chat-icon';
    const m = document.createElement('div');
    m.className = 'm';
    m.innerText = text || `COMMANDS

Channels:
/list - display available channels on retrofeed
/join #channel - join channel by name
/j #channel - join channel by name
cd #channel - join channel by name
/back - navigate back in browser
cd.. OR cd .. - navigate to /chat page

Others:
/help - display this message`;
    row.appendChild(i);
    row.appendChild(m);
    chatCon.appendChild(row);
    return row;
}
const addChatMsg = o => {
    const { icon, paymail, text, txid, handle, blocktime, createdDateTime } = o;
    const d = blocktime ? new Date(blocktime*1000).toISOString().slice(0, 19).replace('T', ' ') : createdDateTime;
    const row = document.createElement('div');
    row.className = 'row';
    const i = document.createElement('img');
    i.src = icon || '../assets/images/icon_192_noback.png';
    i.className = 'chat-icon';
    const ei = document.createElement('img');
    ei.src = '../assets/images/emoji-reaction.svg';
    ei.className = 'emoji-reaction';
    ei.onclick = pickEmoji;
    ei.id = txid;
    const userHandle = paymail !== null && paymail !== undefined ? paymail : handle;
    ei.dataset.handle = userHandle;
    const m = document.createElement('div');
    m.className = 'm';
    const content = text.replace(urlRegex, url => { return `<a class="word-wrap" href='${url}' rel="noreferrer" target="_blank">${url}</a>` })
    m.innerHTML = `${userHandle}: ${content}`;
    const t = document.createElement('a');
    t.href = txid ? `https://whatsonchain.com/tx/${txid}` : '/chat';
    t.target = '_blank';
    t.className = 't';
    const c = document.createElement('i');
    c.className = 'nes-icon coin is-small chat-coin';
    c.id = txid;
    c.dataset.paymail = paymail;
    c.onclick = coinTip;
    const emojiSection = document.createElement('div');
    emojiSection.className = 'emoji-section';
    emojiSection.id = `${txid}_es`;
    emojiSection.dataset.handle = userHandle;
    const date = new Date(d);
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
    row.appendChild(c);
    row.appendChild(ei);
    row.appendChild(emojiSection);
    const theseReactions = reactions.filter(reaction => reaction.likedTxid === txid);
    if (theseReactions.length) {
        theseReactions.forEach(tr => {
            const foundReaction = theseReactions.find(fr => fr.hexcode === tr.hexcode && fr.id !== tr.id);
            if (foundReaction) {
                const f = emojiExists(emojiSection, tr.hexcode);
                if (f) {
                    let count = f.innerText.slice(-1);
                    count++;
                    f.innerText = `${tr.emoji} ${count}`;
                } else {
                    emojiSection.appendChild(addReaction(tr.emoji, tr.hexcode));
                }
            } else {
                emojiSection.appendChild(addReaction(tr.emoji, tr.hexcode));
            }
        })
    }
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
    p.type = 'message';
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
    return r;
}
const postChat = async() => {
    const cmd = chatInput.value.toLowerCase();
    if (cmd === '/ls' || cmd === 'ls' || cmd === '/list' || cmd === '/l' || cmd === 'dir' || cmd === '/dir') {
        const c = await (await fetch(`/channels`)).json();
        let text = `Available Channels on retrofeed:

`;
        c.forEach(l => {
            text += `#${l.channel} (${l.count})
`
        });
        addEphemeralMsg(text);
        chatInput.value = '';
        section.scrollIntoView(false);
        return;
    }
    if (cmd === '/price') {
        const r = await fetch('/priceRequest', {
            method: 'post',
            body: JSON.stringify({
                hcauth: localStorage.hcauth,
                content: 'BSV',
                action: 'chat',
                channel: chatChannel,
                encrypted: encryp === true ? 1 : 0
            })
        })
        const res = await r.json();
        console.log(res)
        if (res) {
            chatInput.value = '';
            section.scrollIntoView(false);
            chatSound.play();
        }
        return;
    }
    if (cmd === '/help') {
        addEphemeralMsg();
        chatInput.value = '';
        section.scrollIntoView(false);
        return;
    }
    if (cmd === '/profile' || cmd === '/me') {
        location.href = '/profile';
        return;
    }
    if (cmd === '/info') {
        location.href = '/info';
        return;
    }
    if (cmd === '/home') {
        location.href = '/';
        return;
    }
    if (cmd === '/back' || cmd === 'back') {
        history.back();
        return;
    }
    if (cmd === 'cd..' || cmd === 'cd ..') {
        location.href = '/chat';
        return;
    }
    if (cmd.startsWith('/join') || cmd.startsWith('/j') || cmd.startsWith('cd ')) {
        let [c, channel] = cmd.split(' ');
        if (!channel) {
            alert('Please specify a channel.');
        }
        if (channel) {
            if (channel.startsWith('#')) {
                channel = channel.substring(1);
            }
            const url = new URL(location.href);
            url.searchParams.set('c', channel);
            location.href = url.href;
        }
        return;
    }
    const obj = {
        icon: localStorage.icon,
        paymail: localStorage.paymail,
        username: localStorage.username,
        text: chatInput.value,
        createdDateTime: new Date()
    }
    addChatMsg(obj);
    chat(obj.text, chatChannel).then(res => { console.log(res) });
    chatInput.value = '';
    section.scrollIntoView(false);
    chatSound.play();
}
const protocol = location.protocol.includes('https') ? 'wss' : 'ws';
const host = location.host.includes('localhost') ? `${location.hostname}:7777` : location.hostname;
const WS_URL = `${protocol}://${location.host}`;
const ws = new WebSocket(`${protocol}://${host}/ws`);
var timerID = 0;
const keepAlive = () => {
    const timeout = 10000;
    if (ws.readyState === ws.OPEN) {
        ws.send('');
    }
    timerID = setTimeout(keepAlive, timeout);
    console.log({timerID})
}
const cancelKeepAlive = () => {
    if (timerID) {
        clearTimeout(timerID);
    }
}
ws.onopen = e => {
    console.log(`OPENED`, e);
    keepAlive();
}
ws.onmessage = async e => {
    console.log(`MESSAGE`, e);
    const str = await e.data.text()
    const payload = JSON.parse(str);
    if (payload.handle !== localStorage.paymail.split('@')[0]) {
        if (chatChannel === payload.channel) {
            addChatMsg(payload);
            section.scrollIntoView(false);
            chatSound.play();
        }
    }
}
ws.onerror = e => {
    console.log(`WS ERROR`, e);
}
ws.onclose = e => {
    console.log(`Closing...`, e);
    if (e.wasClean) {
        console.log(e.code, e.reason);
    }
    cancelKeepAlive();
}