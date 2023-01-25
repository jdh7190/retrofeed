const messageContainer = document.getElementById('message-container');
const replyContainer = document.getElementById('reply-container');
const bSocial = new BSocial(APP);
const chatApp = new BSocial(APP);
var myLikes = [];
const manageContent = (content, con) => {
    content = content.replace('$osg', '');
    if (content.includes('@')) {
        content = content.replace(tagRegex, tag => {
            return tag?.length > 1 ? `<a class="mention" href='/?handle=${tag.slice(1)}' rel="noreferrer">${tag}</a>` : tag;
        })
    }
    if (content.includes('twitter.com')) {
        const tweet = extractTweetUrl(content)
        const pathArray = tweet.split('/');
        if (pathArray.length < 5) {
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
        }
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
            con.innerHTML = content.replace(urlRegex, url => { return `<a class="link-yt" href='${url}' rel="noreferrer" target="_blank">${url}</a>` });
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
const createRetroPost = (post, recent, isReply) => {
    const retropost = document.createElement('div');
    retropost.className = 'retropost';
    if (isReply) {
        retropost.className += ` reply-post`;
    }
    const isRelayXHandle = post.handle.substring(0,1) === '1' ? true : false;
    const paymentAlias = isRelayXHandle ? `${post.handle.slice(1)}@relayx.io` : `${post.handle}@handcash.io`;
    const profile = document.createElement('div');
    profile.className = 'profile';
    const profileImg = document.createElement('img');
    profileImg.className = 'avatar';
    profileImg.alt = 'postAvatar';
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
    coin.setAttribute('data-handle', paymentAlias);
    coin.setAttribute('data-txid', post.txid);
    if (!isReply) {
        const reply = document.createElement('img');
        reply.src = `${location.origin}/assets/images/reply.png`;
        reply.className = 'reply';
        reply.setAttribute('data-handle', paymentAlias);
        reply.setAttribute('data-txid', post.txid);
        reply.onclick = () => location.href = `/tx/?txid=${post.txid}`;
        retropost.appendChild(reply);
    }
    retropost.appendChild(coin);
    const content = document.createElement('p');
    content.className = 'postContent urlFormat';
    if (post.imgs) {
        //content.innerHTML = `<img src="${post.imgs}" class="imgfile" alt="imgfile">`
    }
    retropost.appendChild(content)
    const heart = document.createElement('i');
    heart.className = 'like-heart nes-icon heart is-medium is-empty';
    heart.id = post.txid;
    heart.data = paymentAlias;
    const foundLike = myLikes.length ? myLikes.findIndex(l => l.likedTxid === post.txid) : -1;
    foundLike < 0 ? heart.addEventListener('click', like) : heart.className = 'like-heart nes-icon heart is-medium';
    item.appendChild(heart);
    const numLikes = document.createElement('var');
    numLikes.className = 'numLikes';
    numLikes.id = `${post.txid}_count`;
    item.appendChild(numLikes);
    const star = document.createElement('i');
    star.className = 'nes-icon star is-medium is-empty boost-star';
    if (!isReply) {
        const replyValue = document.createElement('var');
        replyValue.className = 'reply-value';
        replyValue.innerText = post?.replyCount || 0;
        replyValue.id = `${post.txid}_noReplies`;
        item.appendChild(replyValue);
    }
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
    const avatar = isRelayXHandle ? `https://a.relayx.com/u/${paymentAlias}` : post.icon;
    profileImg.src = post.icon !== 'null' ? avatar : 'assets/images/question_block_32.png';
    userLink.href = `${location.origin}/?handle=${post.handle}`;
    userLink.innerText = `${post?.username || ''} ${isRelayXHandle ? '' : '$'}${post?.handle}`;
    manageContent(post?.content, content);
    if (post?.imgs) {
        if (post.imgs.length === 64 || post.imgs.length === 67) {
            const img = document.createElement('img');
            img.src = `${location.origin}/images/${post.imgs}.png`;
            img.className = 'imgfile';
            img.alt = 'imgfile';
            const cLink = document.createElement('a');
            cLink.href = `https://club.relayx.com/p/${post.txid}`;
            cLink.target = '_blank';
            cLink.appendChild(img);
            content.appendChild(cLink);
        } else { content.innerHTML += `<img src="${post.imgs}" class="imgfile" alt="imgfile">` }
    }
    numLikes.innerText = post?.likeCount || 0;
    timeagoSpan.innerText = timeago(new Date(post.createdDateTime));
    retropost.appendChild(item);
    if (isReply) {
        replyContainer.prepend(retropost);
        return;
    }
    recent ? messageContainer.prepend(retropost) : messageContainer.appendChild(retropost);
}
const getRetroPosts = async (selOrder, handle) => {
    loadingDlg('Blowing in the cartridge');
    document.getElementById('message-container').innerHTML = "";
    const posts = await getPosts(selOrder, handle); 
    const d = tzCreatedDateTime(posts[posts.length-1]?.createdDateTime);
    if (localStorage?.paymail && d) {
        myLikes = await getMyLikes(d);
    }
    for (let i = 0; i < posts.length; i++) {
        createRetroPost(posts[i]);
    }
    loadingDlg();
    unfurl();
    /* const imgs = document.querySelectorAll('.imgfile');
    lazyLoadImages(imgs) */
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
            const div = document.createElement('div');
            div.className = 'unfurl';
            const a = document.createElement('a');
            a.href = `/readability/?url=${url}`;
            a.rel = 'noreferrer';
            const img = document.createElement('img');
            img.src = r.ogImage;
            img.className = 'imgfile';
            img.alt = 'imgfile';
            a.appendChild(img);
            div.append(a);
            link.appendChild(div);
            //link.innerHTML += `<div class="unfurl"><a href="/readability/?url=${url}" rel="noreferrer"><img src="${r.ogImage}" class="imgfile" alt="imgfile"></a></div>`;
        }
    }
}
const extractTweetUrl = content => {
    const twtRegex = /http(s)?:\/\/(.*\.)?twitter\.com\/[A-z0-9_/?=]+/;
    return content.replace(twtRegex,  url => { return url });
}
const extractUrl = content => { return content.replace(urlRegex, url => { return url }) }