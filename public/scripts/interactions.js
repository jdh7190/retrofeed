function shareBPost() { 
    if (navigator?.share) {
        navigator.share({
            title: 'retrofeed',
            url: `${location.href}tx/?txid=${this.getAttribute("id")}`
        }).then(() => console.log('Successful share')).catch(error => console.log('Error sharing', error))
    }
    else {
        const copyTx = document.createElement('textarea');
        document.body.appendChild(copyTx);
        copyTx.value = `${location.href}tx/?txid=${this.getAttribute("id")}`;
        copyTx.select();document.execCommand("copy");
        document.body.removeChild(copyTx);
        alert(`Copied URL to clipboard!`);
    }
}
async function boost() {
    console.log('Boosting...')
}
function tip(handleToTip, tippedTxid) {
    if (!localStorage.hcauth) { 
        location.href = '/profile';
        return;
    }
    const handle = this?.dataset?.handle || handleToTip;
    const txid = tippedTxid || this.dataset.txid;
    const m = document.getElementById('myModal');
    m.style.display = 'block';
    modalText.innerText = `How much would you like to tip $${handle}?`;
    tipSection.style.display = 'block';
    document.getElementById('tipConfirm').onclick = async() => {
        const amt = document.getElementById('tipAmt').value;
        if (amt <= 0) {
            alert(`Cannot tip zero or less!`);
            return;
        }
        loadingDlg('Tipping');
        const payload = { tippedHandle: handle, amount: amt, txid, handle: localStorage.paymail.split('@')[0] };
        const p = await hcPost(null, 'tip', payload);
        const coinSound = new Audio();
        coinSound.src = '../assets/sounds/nes_coin.wav';
        loadingDlg();
        coinSound.play();
    }
}
async function like() {
    if (!localStorage.hcauth) { 
        location.href = '/profile';
        return;
    }
    const likedTxid = this.id;
    const heart = document.getElementById(likedTxid);
    loadingLike = true;
    setInterval(() => {
        if (loadingLike) {
            if (heart.className.includes('is-empty')) { heart.className = 'like-heart nes-icon heart is-medium is-half' }
            else if (heart.className.includes('half')) { heart.className = 'like-heart nes-icon heart is-medium' }
            else { heart.className = 'like-heart nes-icon heart is-medium is-empty' }
        }
        else { return }
    }, 400);
    const likeCount = parseInt(document.getElementById(`${likedTxid}_count`).innerText);
    const emoji = '♥';
    const l = bSocial.like(likedTxid, emoji);
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
    const likePayload = { emoji, likedTxid, likedHandle: heart.data, hexcode: '2665' }
    const p = await hcPost(hexarr, 'like', likePayload);
    console.log({p})
    loadingLike = false;
    heartSound.play();
    document.getElementById(likedTxid).className = `like-heart nes-icon heart is-medium`;
    document.getElementById(`${likedTxid}_count`).innerText = likeCount + 1;
}
const bPost = async text => {
    if (!localStorage.hcauth) { 
        location.href = '/profile';
        return;
    }
    const post = document.getElementById("post").value + ` $osg`;
    loadingDlg('Posting');
    document.getElementById("post").value = "";
    try {
        const p = bSocial.post();
        p.addText(post);
        const file = document.querySelector('input[type="file"]')?.files[0];
        const postPayload = { text: post }
        if (file) {
            const fileData = await getBase64File(file);
            p.addImage(fileData);
            postPayload.image = fileData;
        }
        const arrops = p.getOps('utf8');
        let hexarrops = [];
        arrops.forEach(o => { hexarrops.push(str2Hex(o)) })
        const b2sign = arrToBuf(hexarrops);      
        const bsvPrivateKey = bsv.PrivateKey.fromWIF(localStorage.ownerKey);
        const signature = bsvMessage.sign(b2sign.toString(), bsvPrivateKey);
        const payload = arrops.concat(['|', AIP_PROTOCOL_ADDRESS, 'BITCOIN_ECDSA', localStorage.ownerAddress, signature]);
        let hexarr = [];
        payload.forEach(p => { hexarr.push(str2Hex(p)) })
        const res = await hcPost(hexarr, 'post', postPayload);
        console.log({res});
        if (res?.paymentResult?.transactionId) {
            const tempPost = {
                content: post,
                createdDateTime: Date.now(),
                handle: localStorage.paymail.split('@')[0],
                icon: localStorage.icon,
                txid: res.paymentResult.transactionId,
                likeCount: 0,
                username: localStorage?.username || '',
                imgs: postPayload?.image || ''
            }
            createRetroPost(tempPost, true)
            loadingDlg();
        } else { throw res }
    } catch(e) {
        loadingDlg();
        console.log(e);
        showModal(e?.error?.message || e.error);
    }
}