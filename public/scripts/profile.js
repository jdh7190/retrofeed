const login = document.getElementById('login');
const modal = document.getElementById('myModal');
const modalTxt = document.getElementById('modalTxt');
const inventory = document.getElementById('inventory');
if (localStorage?.icon) {
    login.style.display = 'none';
    //inventory.style.display = 'block';
    prof.src = localStorage.icon;
} else {
    login.style.display = 'block';
    //inventory.style.display = 'none';
    prof.src = '../assets/images/profile.svg';
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
        location.href = location.href.includes('localhost') ? `https://app.handcash.io/#/authorizeApp?appId=62c4621d8af65d4fbfd52f80` : `https://app.handcash.io/#/authorizeApp?appId=5fd278ec7df6277a133d56f6`;
    }
    else { location.href = '/' }
}