const share = document.createElement('img');
share.id = 'sharebtn';
share.src = '../assets/images/share.svg';
share.className = 'share';
document.body.prepend(share);
const back = document.createElement('img');
back.id = 'backbtn';
back.src = '../assets/images/back.png';
back.className = 'back';
document.body.prepend(back);
document.getElementById('backbtn').addEventListener('click', () => history.back())
const params = new URLSearchParams(location.search);
document.getElementById('sharebtn').addEventListener('click', e => {
    const title = document.getElementsByTagName('h1')[0];
    if (navigator.share && title) {
        navigator.share({
            title,
            url: location.href
        }).then(() => {
            console.log('Share success.')
        }).catch(e => {alert(e)})
    } else {
        navigator.clipboard.writeText(location.href);
        alert(`Copied URL: ${location.href}`)
    }
});
const iframes = document.getElementsByTagName('iframe');
const youRegex = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;
for (let iframe of iframes) {
    if (!iframe.src) {
        iframe.src = iframe.dataset.src;
    }
}