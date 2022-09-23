const messageContainer = document.getElementById('message-container');
var myLikes = [];
const dots = setInterval(() => {
    const wait = modalText;
    if (loadingPost === true) {
        if (wait.innerText.length > loadingText.length + 2) { wait.innerText = loadingText } 
        else { wait.innerText += "." }
    }
}, 300);
const loadingDlg = txt => {
    loadingText = txt || '';
    document.getElementById('tipSection').style.display = 'none';
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
const manageContent = (content, con) => {
    content = content.replace('$osg', '')
    if (content.includes('twitter.com')) {
        const tweet = extractTweetUrl(content)
        const pathArray = tweet.split('/');
        let id = pathArray[5].trim();
        id = id.includes('?') ? id.split('?')[0] : id;
        const div = document.createElement('div');
        div.id = id;
        const blockquote = document.createElement('blockquote');
        blockquote.className = 'twitter-tweet';
        blockquote.setAttribute('data-theme', 'dark');
        const a = document.createElement('a');
        a.href = tweet;
        a.rel = 'noreferrer';
        blockquote.appendChild(a);
        div.appendChild(blockquote);
        con.appendChild(div);
        return;
    }
    if (content.indexOf("youtu") >= 0) {
        const y = content.replace(youRegex, url => {
            const id = url.slice(-11);
            const vidCon = document.createElement('div');
            vidCon.className = 'youtube-player video-container';
            vidCon.setAttribute('data-id', id);
            const div = document.createElement('div');
            div.setAttribute('data-id', id);
            div.className = 'play-id';
            const thumbNode = document.createElement('img');
            thumbNode.src = '//i.ytimg.com/vi/ID/hqdefault.jpg'.replace('ID',id);
            thumbNode.alt = 'yt';
            div.appendChild(thumbNode);
            const playButton = document.createElement('div');
            playButton.setAttribute('class', 'play');
            div.appendChild(playButton);
            div.onclick = () => { labnolIframe(div) };
            vidCon.appendChild(div);
            con.appendChild(vidCon);
            div.onclick = () => { labnolIframe(div) };
            return vidCon.outerHTML;
        });
        return;
    }
    else {
        con.innerHTML = content.replace(urlRegex, url => { return `<a class="link" href='${url}' rel="noreferrer" target="_blank">${url}</a>` })
        return;
    }
}
const createRetroPost = (post, recent) => {
    const retropost = document.createElement('div');
    retropost.className = 'retropost';
    const profile = document.createElement('div');
    profile.className = 'profile';
    const profileImg = document.createElement('img');
    profileImg.className = 'avatar';
    profile.appendChild(profileImg);
    retropost.appendChild(profile);
    const userLink = document.createElement('a');
    userLink.className = 'userLink';
    retropost.appendChild(userLink);
    const timeagoSpan = document.createElement('span');
    timeagoSpan.className = 'timeago';
    retropost.appendChild(timeagoSpan);
    const item = document.createElement('div');
    item.className = 'item';
    const coin = document.createElement('i');
    coin.className = `nes-icon coin is-medium`;
    coin.onclick = tip;
    coin.setAttribute('data-handle', post.handle);
    coin.setAttribute('data-txid', post.txid);
    retropost.appendChild(coin);
    const content = document.createElement('p');
    content.className = 'postContent urlFormat';
    if (post.imgs) {
        content.innerHTML = `<img src="${post.imgs}" class="imgfile" alt="imgfile">`
    }
    retropost.appendChild(content)
    const heart = document.createElement('i');
    heart.className = 'like-heart nes-icon heart is-medium is-empty';
    heart.id = post.txid;
    heart.data = post.handle;
    const foundLike = myLikes.length ? myLikes.findIndex(l => l.likedTxid === post.txid) : -1;
    foundLike < 0 ? heart.addEventListener('click', like) : heart.className = 'like-heart nes-icon heart is-medium';
    item.appendChild(heart);
    const numLikes = document.createElement('var');
    numLikes.className = 'numLikes';
    numLikes.id = `${post.txid}_count`;
    item.appendChild(numLikes);
    const star = document.createElement('i');
    star.className = 'nes-icon star is-medium is-empty boost-star';
    star.onclick = boost;
    //item.appendChild(star);
    const boostValue = document.createElement('var');
    boostValue.className = 'boostValue';
    boostValue.innerText = 0;
    //item.appendChild(boostValue);
    const share = document.createElement('button');
    share.className = 'share';
    share.id = post.txid;
    share.innerText = 'Share';
    share.onclick = shareBPost;
    item.appendChild(share);
    const txLink = document.createElement('a');
    txLink.className = 'txid';
    txLink.href = `https://whatsonchain.com/tx/${post.txid}`;
    txLink.innerText = '#tx';
    txLink.target = '_blank';
    txLink.rel = 'noreferrer';
    item.appendChild(txLink);
    profileImg.src = post.icon !== 'null' ? post.icon : 'assets/images/question_block_32.png';
    userLink.href = `https://handcash.me/${post.handle}`;
    userLink.innerText = `${post.username}`;
    manageContent(post?.content, content);
    if (post?.imgs) {
        content.innerHTML += `<img src="${post.imgs}" class="imgfile" alt="imgfile">`
    }
    numLikes.innerText = post?.likeCount || 0;
    timeagoSpan.innerText = timeago(new Date(post.createdDateTime));
    retropost.appendChild(item);
    recent? messageContainer.prepend(retropost) : messageContainer.appendChild(retropost);
}
const getRetroPosts = async selOrder => {
    loadingDlg('Blowing in the cartridge');
    document.getElementById('message-container').innerHTML = "";
    const posts = await getPosts(selOrder);
    console.log({posts})
    if (localStorage?.paymail) {
        myLikes = await getMyLikes(localStorage?.paymail.split('@')[0]);
        console.log(myLikes)
    }
    for (let i = 0; i < posts.length; i++) {
        createRetroPost(posts[i]);
    }
    loadingDlg();
    unfurl();
}
const youtube = content => {
    return content.replace(youRegex, url => {
        const id = url.slice(-11);
        const vidCon = document.createElement('div');
        vidCon.className = 'youtube-player video-container';
        vidCon.setAttribute('data-id', id);
        let div = document.createElement('div');
        div.setAttribute('data-id', id);
        div.className = 'play-id';
        let thumbNode = document.createElement('img');
        thumbNode.src = '//i.ytimg.com/vi/ID/hqdefault.jpg'.replace('ID',id);
        thumbNode.alt = 'yt';
        div.appendChild(thumbNode);
        let playButton = document.createElement('div');
        playButton.setAttribute('class', 'play');
        div.appendChild(playButton);
        div.onclick = () => { labnolIframe(div) };
        vidCon.appendChild(div);
        return vidCon.outerHTML;
    });
}
const labnolIframe = con => {
    var iframe = document.createElement('iframe');
    iframe.setAttribute('src', 'https://www.youtube.com/embed/' + con.dataset.id + '?autoplay=1&rel=0');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '1');
    iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
    con.parentNode.replaceChild(iframe, con);
}
const unfurl = () => {
    let linkElements = document.getElementsByClassName('link');
    for (let l of linkElements) { renderLink(l) }
}
const renderLink = async link => {
    let url = link.href;
    if (url) {
    let r = await getImage(url);
        if (r.ogImage !== undefined) {
            link.innerHTML += `<div class="unfurl"><a href="/readability/?url=${url}" rel="noreferrer"><img src="${r.ogImage}" class="imgfile" alt="imgfile"></a></div>`;
        }
    }
}
const extractTweetUrl = content => {
    const twtRegex = /http(s)?:\/\/(.*\.)?twitter\.com\/[A-z0-9_/?=]+/;
    return content.replace(twtRegex,  url => { return url });
}
const extractUrl = content => { return content.replace(urlRegex, url => { return url }) }