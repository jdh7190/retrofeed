const chatApp = new BSocial(APP);
prof.src = localStorage?.icon ? localStorage.icon : '../assets/images/user.png';
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
    checkPost()
    if ((e.key === 'Enter' || e.keyCode === 13) && chatInput.value !== '') {
        postChat();
    }
}
const chatCon = document.getElementById('chatCon');
const getChats = async() => {
    const chats = await (await fetch('/getChats')).json();
    chats.forEach(chat => {
        chat.paymail = `${chat.handle}@handcash.io`;
        if (chat.encrypted) {
            const m = decryptChatMsg(chat.text);
            chat.text = m;
        }
        addChatMsg(chat)
    })
    chatCon.scrollTop = chatCon.scrollHeight;
}
const urlParams = new URLSearchParams(location.search);
const chatChannel = urlParams.get('c') || '';
var encryp = chatChannel?.includes('enc') || false;
getChats();
const addChatMsg = o => {
    const { icon, paymail, username, text } = o;
    const i = document.createElement('img');
    i.src = icon;
    i.className = 'chat-icon';
    const pt = document.createElement('p');
    pt.className = 'chat-title';
    pt.innerText = paymail;
    const p = document.createElement('p');
    p.className = 'chat-text';
    p.innerText = text;
    const d = document.createElement('div');
    d.className = 'chat-line';
    d.appendChild(i);
    d.appendChild(pt)
    d.appendChild(p);
    chatCon.appendChild(d);
    return d;
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
    } else {
        channel = ''
    }
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
        text: chatInput.value
    }
    addChatMsg(obj);
    chat(obj.text);
    chatInput.value = '';
    chatCon.scrollTop = chatCon.scrollHeight;
}