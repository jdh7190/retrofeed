const fetch = require('node-fetch');
const { Readability } = require('@mozilla/readability');
const JSDOM = require('jsdom').JSDOM;
const sleep = timeout => { return new Promise(resolve => setTimeout(resolve, timeout)) }
const replaceAll = (str, find, replace) => { return str.replace(new RegExp(find, 'g'), replace) }
const readability = async url => {
    let r = await fetch(url);
    const data = await r.text();
    let doc = new JSDOM(data, { url });
    let article = new Readability(doc.window.document).parse();
    let baseURL = new URL(url);
    const host = baseURL.host.startsWith('www') ? baseURL.host.substr(4) : baseURL.host;
    let post = `<a href=${url} class="domain">${host}</a>
    <link href="../styles/read.css" rel="stylesheet">
    <h1>${article.title}</h1>
    ${article.byline ? `<div style="font-style: italic;">${article.byline}</div>` : ''}
    <hr>${article.content}`;
    post = replaceAll(post, "'", "''");
    return post;
}
exports.sleep = sleep;
exports.readability = readability;
exports.replaceAll = replaceAll;