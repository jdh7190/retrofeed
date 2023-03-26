const { asm, B } = Run.extra;
var run;
const setName = jig => {
  if (jig.constructor.origin === 'ce8629aa37a1777d6aa64d0d33cd739fd4e231dc85cfe2f9368473ab09078b78_o1') {
    return 'SHUA'
  }
  return jig?.metadata?.name || jig?.name || jig?.constructor?.metadata?.name || jig?.constructor?.name
}
const bImageDataSrc = async txid => {
  const B = await run.load(B_CONTRACT);
  const bImg = await B.load(txid);
  return `data:${bImg.mediaType};base64, ${bImg.base64Data}`;
}
const setImage = async jig => {
  const img = document.createElement('img');
  img.alt = 'bfile';
  let origin, metadata;
  if (jig?.metadata?.image || jig?.metadata?.emoji) {
      metadata = jig?.metadata;
      origin = jig?.origin;
  } else if (jig?.constructor?.metadata?.image || jig?.constructor?.metadata?.emoji) {
      metadata = jig?.constructor?.metadata;
      origin = jig.constructor.origin;
  }
  if (metadata) {
      const { image, emoji } = metadata;
      if (image === '_o1') {
          img.src = await bImageDataSrc(origin.slice(0,64))
          return img.outerHTML;
      }
      if (image?.base64Data) {
          img.src = `data:${image.mediaType};base64, ${image.base64Data}`;
          return img.outerHTML;
      }
      if (image?.substring(0, 4) == 'b://') {
          img.src = await bImageDataSrc(image.slice(-64));
          return img.outerHTML;
      }
      const match = image?.match(/^[0-9a-f]{64}_o[1-9][0-9]*$/g);
      if (match?.length > 0) {
          const bTxid = match[0].slice(0,64);
          console.log(`Matching txid, fetching ${bTxid} from bico.media...`)
          img.src = `https://bico.media/${bTxid}`;
          return img.outerHTML;
      }
      if (emoji) {
          return twemoji.parse(emoji);
      }
      return twemoji.parse('🐉');
  } else {
      return twemoji.parse('🐉');
  }
}
const initRun = () => {
    run = new Run({
        owner: localStorage.ownerKey,
        purse: 'L2ASAwmxR72tbBTTrtR87sjpXeRiAgTkrxa1G8GJuCBKGRGwgiQx',
        api: 'whatsonchain',
        timeout: 90000,
        state: new Run.plugins.RunDB('http://localhost:9004'),
        trust: '*'
    });
    //trustlist.forEach(t => { run.trust(t.slice(0, 64)) })
    return run;
}
const postTxToDB = async(tx, hex) => {
  if (RUN_DB_HOST) {
      if (!hex) {
          hex = await run.blockchain.fetch(tx);
      }
      const r = await (await fetch(`${RUN_DB_HOST}/tx/${tx}`, {
          method: 'post',
          headers: { 'Content-Type': 'text/plain' },
          body: hex
      })).text()
      console.log({r})
  }
}