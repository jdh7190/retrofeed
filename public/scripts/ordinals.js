const m = document.getElementById('myModal');
const modalTxt = document.getElementById('modalTxt');
const modalImg = document.getElementById('modalImg');
const heartSound = new Audio();
heartSound.src = '/assets/sounds/heartpiece.wav';
const bSocial = new BSocial(APP);
var sMonLikes = [];
const inscriptionDetails = inscription => {
    m.style.display = 'block';
    const type = inscription.monType.charAt(0).toUpperCase() + inscription.monType.slice(1);
    const info = m.getElementsByClassName('info')[0];
    const monSound = document.getElementById('monSound');
    monSound.style.display = 'none';
    const stats = m.getElementsByClassName('stats')[0];
    stats.innerHTML = '';
    monSound.src = '';
    info.innerHTML = '';
    const pName = document.createElement('div');
    pName.innerText = inscription.text;
    pName.className = 'info-field';
    const mType = document.createElement('div');
    mType.innerText = type;
    mType.className = 'info-field';
    info.appendChild(pName);
    info.appendChild(mType);
    modalImg.innerHTML = inscription.img;
    modalImg.classList.add('center');
    const i = modalImg.getElementsByTagName('img')[0];
    i.className = 'asset-img';
    i.classList.add('center');
    const tx = m.getElementsByClassName('tx')[0];
    tx.href = `https://whatsonchain.com/tx/${inscription.location.slice(0,64)}?voutOffset=${inscription.vout}&output=${inscription.vout}`;
    tx.style.display = 'block';
    modalImg.style.display = 'block';
    if (inscription?.stats) {
        stats.style.display = 'block';
        const { strength, vitality, agility, spirit, intelligence, luck } = inscription.stats;
        let p = document.createElement('div');
        p.className = 'stat';
        p.innerText = `Strength: ${strength}`;
        stats.appendChild(p);
        p = document.createElement('div');
        p.className = 'stat';
        p.innerText = `Vitality: ${vitality}`;
        stats.appendChild(p);
        p = document.createElement('div');
        p.className = 'stat';
        p.innerText = `Agility: ${agility}`;
        stats.appendChild(p);
        p = document.createElement('div');
        p.className = 'stat';
        p.innerText = `Intelligence: ${intelligence}`;
        stats.appendChild(p);
        p = document.createElement('div');
        p.className = 'stat';
        p.innerText = `Spirit: ${spirit}`;
        stats.appendChild(p);
        p = document.createElement('div');
        p.className = 'stat';
        p.innerText = `Luck: ${luck}`;
        stats.appendChild(p);
    }
    if (inscription?.audio) {
        monSound.src = `../sMon/audio/${inscription.location}.mp3`;
        monSound.style.display = 'block';
        monSound.play();
    }
}
async function likeMon(loc) {
    if (!localStorage.hcauth) { 
        location.href = '/profile';
        return;
    }
    const likedTxid = loc;
    const heart = document.getElementById(likedTxid);
    loadingLike = true;
    setInterval(() => {
        if (loadingLike) {
            if (heart.className.includes('is-empty')) { heart.className = 'like-heart nes-icon heart is-small is-half' }
            else if (heart.className.includes('half')) { heart.className = 'like-heart nes-icon heart is-small' }
            else { heart.className = 'like-heart nes-icon heart is-small is-empty' }
        }
        else { return }
    }, 400);
    const likeCount = parseInt(document.getElementById(`${likedTxid}_count`).innerText);
    const emoji = '🖤';
    const origin = `ord://${likedTxid.split('-')[0]}`;
    const l = bSocial.like(origin, emoji);
    const { hexarr, payload } = signPayload(l, localStorage?.ownerKey, localStorage.ownerAddress, true);
    const likePayload = { emoji, likedTxid: origin, likedHandle: 'shua', hexcode: '2665' }
    const p = await hcPost(hexarr, 'like', likePayload);
    console.log({p})
    loadingLike = false;
    heartSound.play();
    document.getElementById(likedTxid).className = `like-heart nes-icon heart is-small`;
    document.getElementById(`${likedTxid}_count`).innerText = likeCount + 1;
}
const createEntry = ord => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.id = ord.location;
    const span = document.createElement('span');
    span.className = 'item-text';
    if (ord?.img) {
        const templateImg = document.createElement('template');
        templateImg.innerHTML = ord.img.trim();
        const img = templateImg.content.firstChild;
        img.className = 'icon center';
        img.onclick = () => { inscriptionDetails(ord) }
        div.appendChild(img);
    }
    span.innerHTML = ord.text;
    div.appendChild(span);
    const i = document.createElement('i');
    i.className = `like-heart nes-icon heart is-small is-empty`;
    i.id = `${ord.location}-heart`;
    i.onclick = () => { likeMon(i.id) }
    div.appendChild(i);
    const numLikes = document.createElement('var');
    numLikes.className = 'ordLikes';
    numLikes.id = `${i.id}_count`;
    numLikes.innerText = ord?.numLikes || 0;
    div.appendChild(numLikes);
    itemList.appendChild(div);
}
const processSMon = (mon, i) => {
    const { inscriptionId, origin, stats } = mon;
    const ord = { text: `Inscription #${inscriptionId}`, location: origin }
    const img = document.createElement('img');
    img.alt = 'bfile';
    img.src = `../sMon/images/${ord.location}.png`;
    ord.img = img.outerHTML;
    ord.stats = JSON.parse(stats);
    ord.monType = 'Robot';
    ord.audio = true;
    ord.inscriptionId = inscriptionId;
    ord.vout = i;
    const likes = sMonLikes.find(sMon => sMon?.likedOrd === origin);
    if (likes !== undefined) {
        ord.numLikes = likes.numLikes;
    }
    createEntry(ord);
}
const sortSMon = (arr, val) => {
    return arr.sort((a, b) => {
        if (val === 0) {
            return a.inscriptionId - b.inscriptionId;
        } else if (val === 1) {
            return b.inscriptionId - a.inscriptionId;
        } else if (val === 2) {
            return b.totalStats - a.totalStats;
        } else if (val === 3) {
            return b.soundLength - a.soundLength;
        }
    })
}
const fetchOrdinals = async(sort = 0) => {
    loadingDlg('Blowing in the cartridge');
    await sleep(250);
    sMonLikes = await getOrdLikes();
    if (sort < 4) {
        sortSMon(sMonStats, sort);
        for (let i = 0; i < 1000; i++) {
            processSMon(sMonStats[i], i);
        }
    } else {
        const likedSMon = sMonLikes.map(sMon => sMon.likedOrd);
        for (let sMonLike of sMonLikes) {
            const sMon = sMonStats.find(sMon => sMon.origin === sMonLike.likedOrd);
            const idx = sMon.origin.split('_')[1];
            processSMon(sMon, idx);
        }
        for (let i = 0; i < 1000 - sMonLikes.length; i++) {
            if (!likedSMon.includes(sMonStats[i].origin)) {
                processSMon(sMonStats[i], i)
            }
        }
    }
    loadingDlg();
}
document.getElementById("order").onchange = () => {
    let selOrder = parseInt(document.getElementById("order").value);
    document.getElementById('itemList').innerHTML = '';
    fetchOrdinals(selOrder);
    m.style.display = 'none';
}
fetchOrdinals(0);