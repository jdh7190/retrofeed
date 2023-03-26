const m = document.getElementById('myModal');
const modalTxt = document.getElementById('modalTxt');
const modalImg = document.getElementById('modalImg');
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
        div.appendChild(img);
        div.onclick = () => { inscriptionDetails(ord) }
    }
    span.innerHTML = ord.text;
    div.appendChild(span);
    itemList.appendChild(div);
}
const urlParams = new URLSearchParams(location.search);
const txid = 'e17d7856c375640427943395d2341b6ed75f73afc8b22bb3681987278978a584';
const fetchOrdinal = async() => {
    if (txid) {
        loadingDlg('Blowing in the cartridge...');
        let inscriptionId = await inscriptionNumber(txid, 0);
        for (let i = 0; i < 1000; i++) {
            const ord = { text: `Inscription #${inscriptionId}`, location: `${txid}_${i}` }
            const img = document.createElement('img');
            img.alt = 'bfile';
            img.src = `../sMon/images/${ord.location}.png`;
            ord.img = img.outerHTML;
            const {stats} = sMonStats.find(sMon => sMon.origin === ord.location);
            ord.stats = JSON.parse(stats);
            ord.monType = 'Robot';
            ord.audio = true;
            ord.inscriptionId = inscriptionId;
            ord.vout = i;
            createEntry(ord);
            inscriptionId++;
        }
        loadingDlg('Blowing in the cartridge...');
    }
}
fetchOrdinal();