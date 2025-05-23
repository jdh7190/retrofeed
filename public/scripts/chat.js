const chatApp = new BSocial(APP);
var reactions = [];
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
        if (!localStorage.paymail) { 
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
    const handlesSet = new Set(chats.map(c => {
        return !c?.handle.includes('@') ? `${c.handle}@handcash.io` : c.handle;
    }));
    setOfHandles = Array.from(handlesSet);
    setOfHandles = setOfHandles.filter(handle => handle.length < 26);
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
    section.scrollIntoView(false);
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
    const { hexarr, payload } = signPayload(l, localStorage?.ownerKey, localStorage.ownerAddress, true);
    const likePayload = { emoji, likedTxid: txid, likedHandle: handle, hexcode }
    if (localStorage.hcauth) {
        const p = await hcPost(hexarr, 'emoji reaction', likePayload);
        console.log(p);
    } else if (localStorage.walletAddress) {
        const pRawtx = await getPaymentTemplate([{to: handle, satoshis: 1000}]);
        const bsvtx = bsv.Transaction(pRawtx);
        bsvtx.addSafeData(payload);
        const rawtx = await payForRawTx(bsvtx.toString());
        const t = await broadcast(rawtx);
        if (t) {
            const lr = await fetch(`/likeTx`, {
                method: 'post',
                body: JSON.stringify({
                    likedTxid: txid,
                    txid: t,
                    rawtx,
                    handle: localStorage.paymail,
                    likedHandle: handle,
                    emoji,
                    hexcode
                })
            })
            console.log({lr})
        }
    } else if (localStorage.paymail.includes('relayx.io')) {
        const outputs = [{to: handle, amount: 0.00001, currency: 'BSV'}];
        const script = bsv.Script.buildSafeDataOut(payload).toASM();
        outputs.push({ to: script, amount: 0, currency: 'BSV' });
        const t = await relayone.send({outputs});
        if (t.txid) {
            const { rawTx } = t;
            const lr = await fetch(`/likeTx`, {
                method: 'post',
                body: JSON.stringify({
                    likedTxid: txid,
                    txid: t.txid,
                    rawtx: rawTx,
                    handle: localStorage.username,
                    likedHandle: handle,
                    emoji,
                    hexcode
                })
            })
            console.log({lr})
        }
    }
    pickupCoin.play();
}
const customEmojis = [
    { emoji: 'SHUA', label: 'SHUACoin', url: '/assets/images/shua.png', tags: ['bsv', 'token', 'shua'], data: { id: 719 } }
]
async function pickEmoji() {
    if (!localStorage.paymail) { 
        location.href = '/profile';
        return;
    }
    const reactedTxid = this.id;
    const handle = this.dataset.paymail;
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
    if (!localStorage.hcauth && !localStorage.walletAddress) { 
        location.href = '/profile';
        return;
    }
    try {
        const elem = this?.id ? this : el;
        const parentTxid = elem.parentElement?.id.slice(0,64);
        const emoji = elem.innerText.split(' ')[0];
        //const handle = elem.parentElement.dataset.handle;
        const paymail = elem.parentElement.dataset.paymail;
        let count = parseInt(elem.innerText.split(' ')[1])+1;
        elem.innerText = `${emoji} ${count}`;
        emojiLike(emoji, this.id, parentTxid, paymail);
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
const addEphemeralMsg = (text, innerHTML) => {
    const row = document.createElement('div');
    row.className = 'row';
    const i = document.createElement('img');
    i.src = '../assets/images/icon_192_noback.png';
    i.className = 'chat-icon';
    const msgContainer = document.createElement('div');
    msgContainer.className = 'msg-container';
    const msgContent = document.createElement('span');
    msgContent.className = 'm msg';
    const chatName = document.createElement('span');
    chatName.className = 'm name';
    chatName.innerHTML += `retrofeed `;
    chatName.appendChild(msgContent);
    msgContainer.appendChild(chatName);
    if (text) {
        if (innerHTML) {
            msgContent.innerHTML = text;
        } else {
            msgContent.innerText = text;
        }
    } else {
        msgContent.innerText = `COMMANDS

Channels:
/list - display available channels on retrofeed
/join #channel - join channel by name
/j #channel - join channel by name
cd #channel - join channel by name
/back - navigate back in browser
cd.. OR cd .. - navigate to /chat page
/home - navigate to Home page
/profile - navigate to Profile page
/info - navigate to Info page

/price - get price of BSV of various tokens (costs 100 satoshis to request)

Others:
/help - display this message
/rain - airdrop satoshis to each person who posted in last 50 messages`;
    }
    row.appendChild(i);
    row.appendChild(msgContainer);
    chatCon.appendChild(row);
    return row;
}
const addChatMsg = o => {
    const { icon, paymail, text, txid, handle, blocktime, createdDateTime } = o;
    const d = blocktime ? new Date(blocktime*1000).toLocaleString('en-US', {hourCycle: 'h23'}).slice(0, 19).replace('T', ' ') : createdDateTime;
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
    const userHandle = paymail !== null && paymail !== undefined ? paymail?.split('@')[0] : handle;
    ei.dataset.handle = userHandle;
    ei.dataset.paymail = paymail;
    const msgContent = document.createElement('span');
    msgContent.className = 'm msg';
    let content = text.replace(urlRegex, url => { return `<a class="word-wrap" href='${url}' rel="noreferrer" target="_blank">${url}</a>` })
    if (content.includes('@')) {
        content = content.replace(tagRegex, tag => {
            return tag?.length > 1 ? `<a class="mention" href='/?handle=${tag.slice(1)}' rel="noreferrer">${tag}</a>` : tag;
        })
    }
    if (content.includes('#')) {
        content = content.replace(hashtagRegex, hashtag => {
            return hashtag?.length > 1 ? `<a class="hash-tag" href='/chat/?c=${hashtag.slice(1)}' rel="noreferrer">${hashtag}</a>` : hashtag;
        })
    }
    const msgContainer = document.createElement('div');
    msgContainer.className = 'msg-container';
    const chatName = document.createElement('span');
    chatName.className = 'm name';
    chatName.innerHTML += `${userHandle.slice(0,1) === '1' && userHandle.length > 25 && userHandle.length < 36 ? userHandle.slice(0,7) : userHandle} `;
    msgContent.innerHTML += `${content}`;
    const t = document.createElement('a');
    t.href = txid ? `https://whatsonchain.com/tx/${txid}` : '/chat';
    t.target = '_blank';
    t.className = 't';
    chatName.appendChild(msgContent);
    msgContainer.appendChild(chatName);
    msgContainer.appendChild(t);
    const c = document.createElement('i');
    c.className = 'nes-icon coin is-small chat-coin';
    c.id = txid;
    c.dataset.paymail = paymail;
    c.onclick = coinTip;
    const emojiSection = document.createElement('div');
    emojiSection.className = 'emoji-section';
    emojiSection.id = `${txid}_es`;
    emojiSection.dataset.handle = userHandle;
    emojiSection.dataset.paymail = paymail;
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
    row.appendChild(msgContainer)
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
const buildChatMsg = (msg, channel) => {
    const p = chatApp.post();
    if (encryp) {
        const encKey = decryptData(localStorage.encryptedKey, localStorage?.ownerKey);
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
    return signPayload(p, localStorage?.ownerKey, localStorage.ownerAddress);
}
const chat = async(msg, channel, encrypt) => {
    try {
        //const mentions = extractMentions(msg);
        const { payload } = buildChatMsg(msg, channel);
        if (localStorage?.paymail) {
            const bsvtx = bsv.Transaction();
            bsvtx.addSafeData(payload);
            const rawtx = await payForUserRawTx(bsvtx.toString());
            const t = await broadcast(rawtx);
            if (t) {
                await fetch(`/chatTx`, {
                    method: 'post',
                    body: JSON.stringify({
                        text: msg,
                        txid: t,
                        rawtx,
                        handle: localStorage.paymail, 
                        username: localStorage.username,
                        encrypted: encryp === true ? 1 : 0,
                        channel: channel || '',
                        blocktime: Math.floor(Date.now() / 1000),
                    })
                })
                return t;
            }
        }
    } catch(e) {
        console.log(e);
        showModal(e);
    }
}
const postChat = async() => {
    const cmd = chatInput.value.toLowerCase();
    if (cmd === '/ls' || cmd === 'ls' || cmd === '/list' || cmd === '/l' || cmd === 'dir' || cmd === '/dir') {
        const c = (await (await fetch(`/channels`)).json()).filter(channel => channel.count > 2);
        let text = `Available Channels on retrofeed:

`;
        c.forEach(l => {
            text += `<br><a class="hash-tag" href="/chat?c=${l.channel}">#${l.channel.substr(0,24)}</a> (${l.count})
`
        });
        addEphemeralMsg(text, true);
        chatInput.value = '';
        section.scrollIntoView(false);
        return;
    }
    if (cmd.startsWith('/price')) {
        const symbols = ['BSV', 'SHUA', 'HST', 'USDC', 'BAMS', 'SAITO', 'POO', 'TESTNET', 'REX', 'TSC', 'WHST', 'pow.co', 'REXXIE'];
        let [p, symbol] = cmd.split(' ');
        if (!symbol || !symbols.includes(symbol.toUpperCase())) {
            let msg = `Available tokens:

`;
            symbols.forEach(s => {
                msg += `${s}
`
            })
            addEphemeralMsg(msg, false);
            chatInput.value = '';
            section.scrollIntoView(false);
            return;
        }
        console.log(symbol)
        const r = await fetch('/priceRequest', {
            method: 'post',
            body: JSON.stringify({
                hcauth: localStorage.hcauth,
                content: 'BSV',
                action: 'chat',
                channel: chatChannel,
                encrypted: encryp === true ? 1 : 0,
                symbol
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
    if (cmd.startsWith('/rain')) {
        let [c, amount] = cmd.split(' ');
        const satoshiAmount = parseInt(amount);
        if (amount > 0) {
            const {hexarr} = buildChatMsg(cmd, chatChannel);
            const obj = {
                icon: localStorage.icon,
                paymail: localStorage.paymail,
                username: localStorage.username,
                text: chatInput.value,
                createdDateTime: new Date()
            }
            if (localStorage.hcauth) {
                addChatMsg(obj);
                chatInput.value = '';
                section.scrollIntoView(false);
                const r = await fetch('/rain', {
                    method: 'post',
                    body: JSON.stringify({
                        hcauth: localStorage.hcauth,
                        action: 'rain',
                        satoshis: satoshiAmount / 100000000,
                        payload: hexarr,
                        content: {
                            handles: setOfHandles,
                            channel: chatChannel,
                            encrypted: encryp === true ? 1 : 0,
                            blocktime: Math.floor(Date.now() / 1000),
                            text: cmd,
                            handle: localStorage.paymail.split('@')[0],
                            username: localStorage.username,
                        },
                    })
                });
                const res = await r.json();
                console.log(res);
                chatSound.play();
                return;
            } else { alert(`/rain command only supported by HandCash wallet at this time.`) }
        } else {
            addEphemeralMsg(`Please enter a positive whole number of satoshis to rain to handles.
            
Example:

/rain 1000`);
            chatInput.value = '';
            section.scrollIntoView(false);
            return;
        }
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
        paymail: localStorage.paymail.split('@')[0],
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
    if (payload.paymail !== localStorage.paymail) {
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