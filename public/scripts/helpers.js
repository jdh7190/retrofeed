const base64ToArrayBuffer = base64 => {
    const binary_string = atob(base64);
    const bytes = new Uint8Array( binary_string.length );
    for (let i = 0; i < binary_string.length; i++)  {bytes[i] = binary_string.charCodeAt(i) }
    return bytes;
}
const arrBuf2b64 = arrbuf => {
    const s = String.fromCharCode(...new Uint8Array(arrbuf));
    const base64String = btoa(s);
    return base64String;
}
const strToArrayBuffer = binary_string => {
    const bytes = new Uint8Array( binary_string.length );
    for (let i = 0; i < binary_string.length; i++)  {bytes[i] = binary_string.charCodeAt(i) }
    return bytes;
}
const dataToBuf = arr => {
    const bufferWriter = bsv.encoding.BufferWriter();
    arr.forEach(a => { bufferWriter.writeUInt8(a) });
    return bufferWriter.toBuffer();
}
const arrToBuf = arr => {
    const msgUint8 = new TextEncoder().encode(arr);
    const decoded = new TextDecoder().decode(msgUint8);
    const value = decoded.replaceAll(',', '');
    return new TextEncoder().encode(value);
}
const buildTx = async opReturn => {
    const bsvtx = bsv.Transaction();
    const utxos = await run.blockchain.utxos(run.purse.address);
    bsvtx.from(utxos);
    bsvtx.addSafeData(opReturn);
    bsvtx.change(run.purse.address);
    bsvtx.sign(run.purse.privkey);
    console.log(bsvtx.toString())
    return bsvtx.toString();
}
const arrToHex = arr => {
    const array = Array.from(new Uint8Array(arr));
    const hex = array.map(b => b.toString(16).padStart(2, '0')).join('');
    return hex;
}
const str2Hex = str => {
    hex = unescape(encodeURIComponent(str)).split('').map(v => {return v.charCodeAt(0).toString(16).padStart(2,'0')}).join('');
    return hex;
}
const hex2Str = hex => {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        let v = parseInt(hex.substr(i, 2), 16);
        if (v) str += String.fromCharCode(v);
    }
    return str; 
}
const hexArrayToBSVBuf = arr => {
    const hexBuf = arrToBuf(arr);
    const decoded = new TextDecoder().decode(hexBuf);
    const str2sign = hex2Str(decoded);
    const abuf = strToArrayBuffer(str2sign);
    const bsvBuf = dataToBuf(abuf);
    return bsvBuf;
}
const digestMessage = async message => {
    const msgUint8 = new TextEncoder().encode(message);
    const decoded = new TextDecoder().decode(msgUint8);
    const value = decoded.replaceAll(',', '');
    const msgToHash = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgToHash);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
const ascii_to_hexa = str => {
    var arr1 = [];
    for (var n = 0, l = str.length; n < l; n ++) {
        var hex = Number(str.charCodeAt(n)).toString(16);
        arr1.push(hex);
    }
    return arr1.join('');
}
const arrToScript = arr => {
    let script = '0 OP_RETURN';
    for (let i=0; i<arr.length; i++) {
        script += ' ' + ascii_to_hexa(arr[i]);
    }
    return script;
}
const timeago = ms => {
    ms = Date.now() - ms;
    let ago = Math.floor(ms / 1000);
    let part = 0;
    if (ago < 15) { return "just now"; }
    if (ago < 60) { return ago + " sec"; }
    if (ago < 120) { return "1 min"; }
    if (ago < 3600) {
        while (ago >= 60) { ago -= 60; part += 1; }
        return part + " min.";
    }
    if (ago < 7200) { return "1 hr"; }
    if (ago < 86400) {
        while (ago >= 3600) { ago -= 3600; part += 1; }
        return part + " hrs";
    }
    if (ago < 172800) { return "1 day"; }
    if (ago < 604800) {
        part = parseInt(ago / 86400);
        return part + " day(s)";
    }
    if (ago < 1209600) { return "1 wk"; }
    if (ago < 2592000) {
        while (ago >= 604800) { ago -= 604800; part += 1; }
        return part + " wks";
    }
    if (ago < 5184000) { return "1 mth"; }
    if (ago < 31536000) {
        while (ago >= 2592000) { ago -= 2592000; part += 1; }
        return part + " mths";
    }
    if (ago < 1419120000) {
        return ">1 yr";
    }
    return "Not yet";
}
const compare = (a,b) => {
    let aBoost = a.boostValue, bBoost = b.boostValue, comp = 0;
    if (aBoost < bBoost) {comp = 1} 
    else if (aBoost > bBoost) {comp = -1} 
    return comp;
}
const sleep = timeout => { return new Promise(resolve => setTimeout(resolve, timeout)) }
const logout = () => {
    localStorage.clear();
    location.href = '/';
}
const sortDate = (arr, byNew) => {
    return arr.sort((a, b) => {
        const aDate = new Date(a?.createdDateTime || a.datetime);
        const bDate = new Date(b?.createdDateTime || b.datetime);
        if (byNew) {
            return bDate - aDate;
        } else {
            return aDate - bDate;
        }
    });
}
const sortLikes = arr => {
    return arr.sort((a, b) => {
        return a.likeCount > b.likeCount;
    })
}
const goBack = () => {
    history.back();
}
const eciesDecrypt = (encrypted, key) => {
    const decrypted = new bsvEcies().privateKey(bsv.PrivateKey.fromWIF(key)).decrypt(encrypted);
    return atob(decrypted.toString());
}
const eciesEncrypt = (text, key) => {
    const pk = bsv.PrivateKey.fromWIF(key);
    const pubkey = bsv.PublicKey.fromPrivateKey(pk);
    const encrypted = new bsvEcies().privateKey(pk).publicKey(pubkey).encrypt(btoa(encodeURIComponent(text)));
    return encrypted.toString('base64');
}
const decryptData = (data, key) => { return decodeURIComponent(eciesDecrypt(dataToBuf(base64ToArrayBuffer(data)), key)) }
const decryptChatMsg = data => {
    const decryptionKey = decryptData(localStorage.encryptedKey, localStorage?.ownerKey);
    const decryptedData = decryptData(data, decryptionKey);
    return decryptedData;
}
const getBase64File = file => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            resolve(reader.result);
        }
        reader.onerror = e => {
            console.log(`Error, ${e}`);
        }
    })
}
const loadingDlg = txt => {
    loadingText = txt || '';
    if (loadingPost) {
        modalText.innerText = '';
        modal.style.display = 'none';
        loadingPost = false;
    } else {
        modalText.innerText = txt;
        modal.style.display = 'block';
        loadingPost = true;
    }
}
const throttle = (func, timeFrame) => {
    let lastTime = 0;
    return function () {
        let now = Date.now();
        if (now - lastTime >= timeFrame) {
            func();
            lastTime = now;
        }
    };
}
const lazyLoadImages = imgs => {
    const lazyImages = [...imgs];
    const inAdvance = 10;
    const lazyLoad = () => {
        lazyImages.forEach(img => {
            if (!img.src && img.parentElement.offsetTop < window.innerHeight + window.pageYOffset + inAdvance) {
                img.src = img.dataset.src;
            }
        })
    }
    lazyLoad();
    addEventListener('scroll', throttle(lazyLoad, 50));
    addEventListener('resize', throttle(lazyLoad, 50))
}
const extractMentions = text => {
    let mentions = text.match(tagRegex);
    if (mentions?.length) {
        mentions = mentions.filter(m => m.length > 1)?.map(m => m.slice(1));
    }
    return mentions;
}
const tzCreatedDateTime = createdDateTime => {
    const ld = new Date(createdDateTime);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(ld.getTime() - tzoffset).toISOString().slice(0, 19).replace('T', ' ');
}
const buf2Str = buf => {
    const decoder = new TextDecoder('utf8');
    return decoder.decode(buf);
}
const getValue = (arr, value) => {
    const increment = value === 'tx' || value === 'context' || value === 'channel' || value === 'club' ? 2 : 1;
    const idx = arr.findIndex(a => a === value) + increment;
    return arr[idx];
}
const getPaymentTemplate = async outputs => {
    const r = await fetch(`/outputTemplate`, {
        method: 'post',
        body: JSON.stringify({ outputs })
    })
    const { rawtx } = await r.json();
    return rawtx;
}
const runPaymail = async paymail => {
    const r = await fetch(`https://api.relayx.io/v1/paymail/run/${paymail.toLowerCase()}`);
    const { data } = await r.json();
    return data;
}