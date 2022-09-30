const login = document.getElementById('login');
const inventory = document.getElementById('inventory');
const itemList = document.getElementById('itemList');
const ownerDetails = document.getElementById('ownerDetails');
const createItem = item => {
    const p = document.createElement('p');
    const span = document.createElement('span');
    span.className = 'item text';
    if (item?.img) {
        span.appendChild(item.img)
    }
    span.innerHTML += item.text;
    if (item?.amount) {
        span.innerHTML += ` &times; ${item.amount}`;
    }
    p.appendChild(span);
    itemList.appendChild(p);
}
const nameHelper = metadata => {
    return metadata?.name || metadata?.symbol;
}
const imageHelper = (metadata, origin) => {
    console.log(metadata)
    const img = document.createElement('img');
    img.className = 'icon';
    if (metadata?.image) {
        if (metadata.image === '_o1') {
            img.src = `https://mornin.run/${origin}/img.png`;
            return img;
        }
        img.src = `data:${metadata.image.mediaType};base64, ${metadata.image.base64Data}`;
        return img;
    }
    if (metadata?.emoji) {
        const s = document.createElement('span');
        s.innerText = metadata.emoji;
        return s;
    }
    return img;
}
const inventoryManager = async() => {
    const run = initRun();
    loadingDlg('Searching bag');
    const utxos = []; //await run.blockchain.utxos(run.owner.address);
    if (utxos?.length) {
        for (const utxo of utxos) {
            const jig = await run.load(`${utxo.txid}_o${utxo.vout}`);
            const name = nameHelper(jig.constructor.metadata);
            const item = {
                text: name,
                amount: jig?.amount || 1
            }
            const img = imageHelper(jig.constructor.metadata, jig.constructor.origin);
            item.img = img;
            createItem(item);
        }
    } else {
        const noItems = { text: 'No items.' };
        createItem(noItems);
    }
    /* const p = document.createElement('p');
    p.innerText = localStorage.ownerAddress;
    ownerDetails.appendChild(p); */
    loadingDlg();
}
if (localStorage?.icon) {
    login.style.display = 'none';
    prof.src = localStorage.icon;
    inventoryManager();
    //inventory.style.display = 'block';

} else {
    login.style.display = 'block';
    inventory.style.display = 'none';
    prof.src = '../assets/images/userprofile.png';
}
const getHcProfile = async() => {
    if (location.href.includes('authToken')) {
        const urlParams = new URLSearchParams(location.search);
        const hcauth = urlParams?.get('authToken');
        if (hcauth) {
            localStorage.hcauth = hcauth;
            let res = await fetch('/hcaccount', {
                method: 'post',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ hcauth })
            });
            let jres = await res.json();
            if (jres.error) {
                alert(jres.error.message);
                localStorage.clear();
                return;
            }
            if (jres.publicProfile) {
                localStorage.setItem('icon', jres?.publicProfile?.avatarUrl);
                localStorage.setItem('paymail', jres.publicProfile.paymail);
                localStorage.setItem('ownerKey', jres.publicProfile.privateKey);
                localStorage.setItem('ownerPublicKey', jres.publicProfile.publicKey);
                localStorage.setItem('ownerAddress', jres.publicProfile.address);
                localStorage.setItem('username', jres.publicProfile.displayName);
                localStorage.setItem('encryptedKey', jres.publicProfile.encryptedKey);
                modal.style.display = 'block';
                modalTxt.innerText = `Logged in with Handcash handle $${jres?.publicProfile?.handle}!`;
                setInterval(() => { location.href = '/' }, 1000);
            }
        }
    }
}
getHcProfile();
const hcLogin = () => {
    if (!localStorage.hcauth) {
        localStorage.clear();
        location.href = location.href.includes('localhost') ? `https://app.handcash.io/#/authorizeApp?appId=62c4621d8af65d4fbfd52f80` : `https://app.handcash.io/#/authorizeApp?appId=632dcca7fb8da441d62e31f9`;
    }
    else { location.href = '/' }
}