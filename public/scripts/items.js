const inventory = document.getElementById('inventory');
const itemList = document.getElementById('itemList');
const m = document.getElementById('myModal');
const modalTxt = document.getElementById('modalTxt');
const modalImg = document.getElementById('modalImg');
const assetDetails = async(item, isToken) => {
    m.style.display = 'block';
    const type = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    const info = m.getElementsByClassName('info')[0];
    const monSound = document.getElementById('monSound');
    monSound.style.display = 'none';
    const stats = m.getElementsByClassName('stats')[0];
    stats.innerHTML = '';
    monSound.src = '';
    info.innerHTML = '';
    const pName = document.createElement('div');
    pName.innerText = item.text;
    pName.className = 'info-field';
    const mType = document.createElement('div');
    mType.innerText = isToken ? `Balance: ${item.amount}` : type;
    mType.className = 'info-field';
    info.appendChild(pName);
    info.appendChild(mType);
    modalImg.innerHTML = item.img;
    modalImg.classList.add('center');
    const i = modalImg.getElementsByTagName('img')[0];
    i.className = 'asset-img';
    i.classList.add('center');
    const tx = m.getElementsByClassName('tx')[0];
    tx.href = `https://whatsonchain.com/tx/${item.location.slice(0,64)}`;
    tx.style.display = 'block';
    modalImg.style.display = 'block';
    const asset = await run.load(item.location);
    if (asset?.stats) {
        stats.style.display = 'block';
        const { strength, vitality, agility, spirit, intelligence, luck } = asset.stats;
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
    if (asset?.metadata?.audio) {
        const audio = await B.load(asset.metadata.audio.slice(4));
        monSound.src = `data:audio/mp3;base64,${audio.base64Data}`;
        monSound.style.display = 'block';
        monSound.play();
    }
}
const createItem = (item, isToken) => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.id = item.location;
    const span = document.createElement('span');
    span.className = 'item-text';
    if (item?.img) {
        const templateImg = document.createElement('template');
        templateImg.innerHTML = item.img.trim();
        const img = templateImg.content.firstChild;
        img.className = 'icon center';
        div.appendChild(img);
        div.onclick = () => {
            //item.img = img;
            assetDetails(item, isToken);
        }
    }
    span.innerHTML = isToken ? `${item.text} &times; ${item.amount}` : item.text;
    div.appendChild(span);
    
    itemList.appendChild(div);
}
const inventoryManager = async() => {
    if (localStorage?.ownerAddress) {
        loadingDlg('Loading');
        try {
            const run = initRun();
            const utxos = await run.blockchain.utxos(run.owner.address);
            if (utxos?.length) {
                for (const utxo of utxos) {
                    const location = `${utxo.txid}_o${utxo.vout}`;
                    const jig = await run.load(location);
                    const name = setName(jig);
                    console.log(location, name)
                    const item = {
                        text: name,
                        amount: jig?.amount || 1,
                        location,
                        type: jig?.metadata?.type || ''
                    }
                    if (jig?.metadata?.image) {
                        const img = await setImage(jig);
                        item.img = img;
                    } else {
                        const img = await setImage(jig);
                        item.img = img;
                    }
                    const isToken = jig?.constructor?.deps?.Token ? true : false;
                    createItem(item, isToken);
                    //postTxToDB(utxo.txid)
                }
            } else {
                const noItems = { text: 'No items.' };
                createItem(noItems);
            }
        } catch(e) {
            console.log(e);
            loadingDlg();
            alert(e);
            return;
        }
        loadingDlg();
    }
}
const mint = async monName => {
    const r = await fetch(`/mintSHUAmon`, {
        method: 'post',
        body: JSON.stringify({
            hcauth: localStorage.hcauth,
            ownerAddress: localStorage.ownerAddress,
            handle: localStorage.paymail.split('@')[0],
            monName 
        })
    })
    const res = await r.json();
    console.log(res);
}
inventoryManager();