const youRegex = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;
const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
const similarity = (s1, s2) => {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}
const evaluateThumbnail = () => {
    let score = 0.85;
    const page = document.getElementsByClassName('page')[0];
    /* const pageElements = page.getElementsByTagName('*');
    const allPageElements = Array.from(pageElements).slice(0,5); */
    const thumbnail = sessionStorage?.thumbnail;
    if (thumbnail?.includes('images.nintendolife.com')) { score = 0.65 }
    if (thumbnail?.includes('siliconera') || thumbnail?.includes('reedpopcdn')) { score = 0.839 }
    const hrs = document.getElementsByTagName('hr');
    if (hrs) {
        const hr = hrs[0];
        if (hr && thumbnail) {
            const firstImg = page.getElementsByTagName('img')[0];
            if (firstImg) {
                const s = similarity(firstImg.src, thumbnail);
                if (s > score) { firstImg.remove() }
            }
            const thumb = document.createElement('img');
            thumb.src = thumbnail;
            console.log(thumb.naturalHeight)
            thumb.className = 'reader-header-image';
            thumb.style.maxHeight = thumb.naturalHeight;
            hr.insertAdjacentElement('afterend', thumb);
        }
    }
}
const readerManager = () => {
    let headerBar = document.getElementsByClassName('header-bar')[0];
    if (!headerBar) {
        console.log('NO HEADER BAR CASE')
        headerBar = document.createElement('div');
        headerBar.className = 'header-bar';
        document.body.prepend(headerBar);
        const atag = document.getElementsByClassName('domain')[0];
        if (atag) {
            atag.remove();
        }
        const h1 = document.getElementsByTagName('h1')[0];
        if (h1) {
            const h3 = document.createElement('h3');
            h3.innerText = h1.innerText;
            document.body.replaceChild(h3, h1);
            const s = document.querySelectorAll('*[style]')[0];
            if (s) {
                const urlParams = new URLSearchParams(location.search);
                const bookURL = new URL(urlParams.get('url'));
                const domain = bookURL.host.startsWith('www') ? bookURL.host.substring(4) : bookURL.host;
                s.style = '';
                s.className = 'byline';
                s.innerText = `By ${s.innerText} `;
                s.innerHTML += `<a class="byline" href=${bookURL.origin} class="domain">${domain}</a>`;
            }
        }
    }
    const share = document.createElement('img');
    share.id = 'sharebtn';
    share.src = '../assets/images/share.svg';
    share.className = 'share';
    share.addEventListener('click', e => {
        const title = document.getElementsByTagName('h3')[0];
        if (navigator.share && title) {
            navigator.share({
                title: title.innerText,
                url: location.href
            });
        } else {
            navigator.clipboard.writeText(location.href);
            alert(`Copied URL: ${location.href}`)
        }
    });
    headerBar.appendChild(share);
    const back = document.createElement('img');
    back.id = 'backbtn';
    back.src = '../assets/images/back.png';
    back.className = 'back';
    back.addEventListener('click', () => history.back())
    headerBar.appendChild(back);
    const imgs = document.getElementsByTagName('img');
    for (const img of imgs) {
        if (img.src.includes('base64') && img.dataset.original) {
            img.src = img.dataset.original;
        }
        img.style.objectFit = 'cover';
    }
    const iframes = document.getElementsByTagName('iframe');
    for (let iframe of iframes) {
        if (!iframe.src) {
            iframe.src = iframe.dataset.src;
        }
        if (iframe.src.includes('yout')) {
            if (!iframe.style.height) {
                iframe.style.minHeight = '225px';
                iframe.style.maxHeight = '420px';
                iframe.style.height = '100%';
            }
            iframe.style.maxWidth = iframe.width;
            iframe.style.width = '100%';
        }
    }
    const bodyHTML = document.body.innerHTML;
    document.body.innerHTML = '';
    const pageReader = document.createElement('div');
    pageReader.className = 'page-reader';
    pageReader.innerHTML = bodyHTML;
    document.body.append(pageReader);
    evaluateThumbnail();
    const pageHeader = pageReader.getElementsByClassName('header-bar')[0];
    pageReader.removeChild(pageHeader);
    document.body.prepend(headerBar);
    const darkModeEvaluate = () => {
        back.src = '../assets/back_default.svg';
        share.src = '../assets/share_default.svg';
        document.body.style.color = '#c9c9c9';
        document.body.style.backgroundColor = '#202020';
        headerBar.style.backgroundColor = '#202020';
        const metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        metaTheme.content = '#202020';
        document.head.appendChild(metaTheme);
    }
    if (parseInt(localStorage?.darkModeReader) === 1) { darkModeEvaluate() }
}
if (location.pathname.includes('readability')) {
    readerManager();
}