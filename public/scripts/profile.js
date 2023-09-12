const login = document.getElementById('login');
const ownerDetails = document.getElementById('ownerDetails');
const p = document.createElement('span');
p.className = 'owner-address';
p.innerText = localStorage.ownerAddress;
ownerDetails.appendChild(p);
inventory.style.display = 'none';
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
        if (localStorage.walletAddress) {
            alert(`Please logout first.`);
            return;
        }
        localStorage.clear();
        const appId = location.href.includes('localhost') ? '62c4621d8af65d4fbfd52f80' : '632dcca7fb8da441d62e31f9';
        location.href = `https://app.handcash.io/#/authorizeApp?referrerHandle=shua&appId=${appId}`;
    }
    else { location.href = '/' }
}
const relayXLogin = async() => {
    if (localStorage.hcauth || localStorage.walletAddress) {
        alert(`Please logout first.`);
        return;
    }
    loadingDlg('Loading');
    const token = await relayone.authBeta({withGrant:true});
    const [payload] = token.split(".");
    const data = JSON.parse(atob(payload));
    console.log({data})
    if (data?.paymail) {
        try {
            localStorage.paymail = data.paymail;
            localStorage.icon = `https://a.relayx.com/u/${data.paymail}`;
            localStorage.relayXPubkey = data.pubkey;
            const ownerAddress = bsv.PublicKey.fromHex(data.pubkey).toAddress().toString();
            localStorage.ownerAddress = ownerAddress;
            const oneHandle = data.paymail.split('@')[0];
            localStorage.username = oneHandle;
            if (ownerAddress) {
                await fetch('/walletAccount', {
                    method: 'post',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        address: localStorage.paymail,
                        ownerAddress: ownerAddress,
                        publicKey: data.pubkey,
                        avatarURL: localStorage.icon,
                        handle: oneHandle,
                        username: oneHandle
                    })
                });
            }
            loadingDlg();
            alert(`Logged in with RelayX One Handle 1${oneHandle}!`);
            setTimeout(() => { location.href = '/' }, 1000);
        }
        catch(e){ alert(e) }
    } else { alert(`RelayX Login failed.`) }
}