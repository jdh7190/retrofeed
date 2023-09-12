const signPayload = (data, pkWIF, address, isLike = false) => {
    const arrops = data.getOps('utf8');
    let hexarrops = [];
    hexarrops.push('6a');
    if (isLike) { hexarrops.push('6a') }
    arrops.forEach(o => { hexarrops.push(str2Hex(o)) })
    if (isLike) { hexarrops.push('7c') }
    let hexarr = [], payload = [];
    if (pkWIF) {
        const b2sign = hexArrayToBSVBuf(hexarrops);
        const bsvPrivateKey = bsv.PrivateKey.fromWIF(pkWIF);
        const signature = bsvMessage.sign(b2sign.toString(), bsvPrivateKey);
        payload = arrops.concat(['|', AIP_PROTOCOL_ADDRESS, 'BITCOIN_ECDSA', address, signature]);
    } else { payload = arrops }
    payload.forEach(p => { hexarr.push(str2Hex(p)) })
    return { hexarr, payload };
}
const relaySignPayload = async(data, address, isLike) => {
    const arrops = data.getOps('utf8');
    let hexarrops = [];
    hexarrops.push(location.href.includes('localhost') ? '3152454c415954455354' : '31524574523574514d52395a4a626d35574d727a663875643677364c794b477150');
    hexarrops.push('6a');
    if (isLike) { hexarrops.push('6a') }
    arrops.forEach(o => { hexarrops.push(str2Hex(o)) })
    if (isLike) { hexarrops.push('7c') }
    const b2sign = hexArrayToBSVBuf(hexarrops);
    let hexarr = [];
    const signature = await relayone.sign(b2sign.toString());
    const payload = arrops.concat(['|', AIP_PROTOCOL_ADDRESS, 'BITCOIN_ECDSA', address, signature.value]);
    payload.forEach(p => { hexarr.push(str2Hex(p)) })
    return { hexarr, payload };
}
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
    if (!localStorage.paymail) { 
        location.href = '/profile';
        return;
    }
    const handle = this?.dataset?.handle || handleToTip;
    const txid = tippedTxid || this.dataset.txid;
    const m = document.getElementById('myModal');
    m.style.display = 'block';
    modalText.innerText = `How much would you like to tip ${handle}?`;
    tipSection.style.display = 'block';
    document.getElementById('tipConfirm').onclick = async() => {
        const amt = document.getElementById('tipAmt').value;
        if (amt <= 0) {
            alert(`Cannot tip zero or less!`);
            return;
        }
        loadingDlg('Tipping');
        const payload = { tippedHandle: handle, amount: amt, txid, handle: localStorage.paymail.split('@')[0] };
        if (localStorage.hcauth) {
            await hcPost(null, 'tip', payload);
        } else if (localStorage.walletAddress) {
            const r = await fetch(`/outputTemplate`, {
                method: 'post',
                body: JSON.stringify({ outputs: [{ to: handle, amount: amt }] })
            })
            const res = await r.json();
            const rawtx = await payForRawTx(res.rawtx);
            const t = await broadcast(rawtx);
            if (t) {
                const tp = await fetch(`/tipTx`, {
                    method: 'post',
                    body: JSON.stringify({
                        tippedHandle: handle, handle: localStorage.paymail.split('@')[0], txid: t, tippedTxid: txid, amount: amt
                    })
                });
                console.log({tp})
            }
        } else if (localStorage.paymail.includes('relayx.io')) {
            const outputs = [{to: handle, amount: amt, currency: 'USD'}];
            const t = await relayone.send({outputs});
            if (t.txid) {
                const { txid, rawTx } = t;
                const tp = await fetch(`/tipTx`, {
                    method: 'post',
                    body: JSON.stringify({ tippedHandle: handle, handle: localStorage.paymail.split('@')[0], txid, tippedTxid: txid, amount: amt })
                });
                console.log({tp})
            }
        }
        const coinSound = new Audio();
        coinSound.src = '../assets/sounds/nes_coin.wav';
        loadingDlg();
        coinSound.play();
    }
}
async function like() {
    if (!localStorage.paymail) { 
        location.href = '/profile';
        return;
    }
    const likedTxid = this.id;
    const heart = document.getElementById(likedTxid);
    loadingLike = true;
    try {
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
        const { hexarr, payload } = signPayload(l, localStorage?.ownerKey, localStorage.ownerAddress, true);
        const likePayload = { emoji, likedTxid, likedHandle: heart.data, hexcode: '2665' }
        if (localStorage?.hcauth) {
            const p = await hcPost(hexarr, 'like', likePayload);
            console.log({p})
        } else if (localStorage?.walletAddress) {
            const pRawtx = await getPaymentTemplate([{to: heart.data, amount: 0.01}]);
            const bsvtx = bsv.Transaction(pRawtx);
            bsvtx.addSafeData(payload);
            const rawtx = await payForRawTx(bsvtx.toString());
            const t = await broadcast(rawtx);
            if (t) {
                const lr = await fetch(`/likeTx`, {
                    method: 'post',
                    body: JSON.stringify({
                        likedTxid, txid: t, rawtx, handle: localStorage.paymail, likedHandle: heart.data, emoji, hexcode: '2665'
                    })
                })
                console.log({lr})
            }
        } else if (localStorage.paymail.includes('relayx.io')) {
            const outputs = [{to: heart.data, amount: 0.01, currency: 'USD'}];
            const script = bsv.Script.buildSafeDataOut(payload).toASM();
            outputs.push({ to: script, amount: 0, currency: 'BSV' });
            const t = await relayone.send({outputs});
            if (t.txid) {
                const { txid, rawTx } = t;
                const lr = await fetch(`/likeTx`, {
                    method: 'post',
                    body: JSON.stringify({
                        likedTxid, txid, rawtx: rawTx, handle: localStorage.username, likedHandle: heart.data, emoji, hexcode: '2665'
                    })
                })
                console.log({lr})
            }
        }
        loadingLike = false;
        heartSound.play();
        document.getElementById(likedTxid).className = `like-heart nes-icon heart is-medium`;
        document.getElementById(`${likedTxid}_count`).innerText = likeCount + 1;
    } catch(e) {
        console.log(e);
        heart.className = 'like-heart nes-icon heart is-medium is-empty'
        showModal(e);
    }
}
const bPost = async (text, replyTxid) => {
    if (!localStorage.paymail) { 
        location.href = '/profile';
        return;
    }
    const post = document.getElementById("post").value;
    loadingDlg('Posting');
    document.getElementById("post").value = "";
    try {
        const p = replyTxid ? bSocial.reply(replyTxid) : bSocial.post();
        p.addText(post);
        const file = document.querySelector('input[type="file"]')?.files[0];
        let postPayload = { text: post }
        if (replyTxid) {
            postPayload.replyTxid = replyTxid;
        }
        if (file) {
            const fileData = await getBase64File(file);
            p.addImage(fileData);
            postPayload.image = fileData;
        }
        const { hexarr, payload } = signPayload(p, localStorage?.ownerKey, localStorage.ownerAddress);
        const mentions = extractMentions(post);
        if (mentions?.length) { postPayload.mentions = mentions }
        const action = replyTxid ? 'reply' : 'post';
        if (localStorage.hcauth) {
            const res = await hcPost(hexarr, action, postPayload);
            console.log({res});
            if (res?.paymentResult?.transactionId) {
                const tempPost = {
                    content: post,
                    createdDateTime : Date.now(),
                    handle: localStorage.paymail.split('@')[0],
                    icon: localStorage.icon,
                    txid: res.paymentResult.transactionId,
                    likeCount: 0,
                    username: localStorage?.username || '',
                    imgs: postPayload?.image || '',
                    replyTxid,
                    paymail: localStorage.paymail
                }
                createRetroPost(tempPost, true, replyTxid ? true : false);
                loadingDlg();
            } else { throw res }
        }
        else if (localStorage.walletAddress) {
            try {
                const bsvtx = bsv.Transaction();
                bsvtx.addSafeData(payload);
                const rawtx = await payForRawTx(bsvtx.toString());
                const t = await broadcast(rawtx);
                if (t) {
                    const tempPost = {
                        content: post,
                        createdDateTime : Date.now(),
                        handle: localStorage?.username,
                        icon: localStorage?.icon,
                        txid: t,
                        likeCount: 0,
                        username: localStorage?.username || '',
                        imgs: postPayload?.image || '',
                        replyTxid,
                        paymail: localStorage.walletAddress
                    }
                    createRetroPost(tempPost, true, replyTxid ? true : false);
                    loadingDlg();
                }
                if (action === 'reply') {
                    const br = await fetch(`/bReply`, {
                        method: 'post',
                        body: JSON.stringify({
                            content: post,
                            txid: t,
                            rawtx,
                            handle: localStorage.username,
                            image: postPayload?.image,
                            replyTxid
                        })
                    })
                    console.log({br})
                } else {
                    const bp = await fetch(`/bPost`, {
                        method: 'post',
                        body: JSON.stringify({
                            content: post, 
                            txid: t, 
                            handle: localStorage?.username,
                            image: postPayload?.image,
                            app: 'retrofeed.me',
                            paymail: localStorage.paymail,
                            rawtx
                        })
                    });
                    console.log({bp})
                }
            } catch(e) { throw e }
        }
        else if (localStorage?.paymail.includes('relayx.io')) {
            const script = bsv.Script.buildSafeDataOut(payload).toASM();
            const outputs = [{ to: script, amount: 0, currency: 'BSV' }];
            const t = await relayone.send({outputs});
            if (t.txid) {
                const { txid, rawTx } = t;
                const tempPost = {
                    content: post,
                    createdDateTime : Date.now(),
                    handle: localStorage?.username,
                    icon: localStorage.icon,
                    txid,
                    likeCount: 0,
                    username: localStorage?.username || '',
                    imgs: postPayload?.image || '',
                    replyTxid,
                    paymail: localStorage.paymail
                }
                createRetroPost(tempPost, true, replyTxid ? true : false);
                loadingDlg();
                if (action === 'reply') {
                    const br = await fetch(`/bReply`, {
                        method: 'post',
                        body: JSON.stringify({
                            content: post,
                            txid,
                            rawtx: rawTx,
                            handle: localStorage.username,
                            image: postPayload?.image,
                            replyTxid
                        })
                    })
                    console.log({br})
                } else {
                    const bp = await fetch(`/bPost`, {
                        method: 'post',
                        body: JSON.stringify({
                            content: post, 
                            txid,
                            rawtx: rawTx,
                            handle: localStorage?.username,
                            image: postPayload?.image,
                            app: 'retrofeed.me',
                            paymail: localStorage.paymail,
                        })
                    });
                    console.log({bp})
                }
            }
        }
    } catch(e) {
        loadingDlg();
        console.log(e);
        showModal(e?.error?.message || e?.error || e);
    }
}