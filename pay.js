const bsv = require('bsv');
const fetch = require('node-fetch');
const P2PKH_SIGSCRIPT_SIZE = 1 + 73 + 1 + 33;
const P2PKH_INPUT_SIZE = 36 + 1 + P2PKH_SIGSCRIPT_SIZE + 4;
const FEE_PER_KB = 1;
const FEE_FACTOR = (FEE_PER_KB / 1000);
const PK_WIF = 'Kyf373G9DzsMmXBAjvCGz1t6PKfRGUqTBF9Jb7248EUb2tGa3WpZ';
const ADDRESS_STRING = '1JhB1UEj4T7smToc7DrJJRCXnwnksWZ848';
const getUTXOs = async address => {
    const r = await fetch(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`);
    const res = await r.json();
    return res;
}
const getRawtx = async txid => {
    const r = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`);
    const raw = await r.text();
    return raw;
}
const between = (x, min, max) => { return x >= min && x <= max }
const getPaymentUTXOs = async(address, amount) => {
    const utxos = await getUTXOs(address);
    const addr = bsv.Address.fromString(address);
    const script = bsv.Script.fromAddress(addr);
    let cache = [], satoshis = 0;
    for (let utxo of utxos) {
        if (utxo.value > 1) {
            const foundUtxo = utxos.find(utxo => utxo.value + 2 > amount);
            if (foundUtxo) {
                return [{ satoshis: foundUtxo.value, vout: foundUtxo.tx_pos, txid: foundUtxo.tx_hash, script: script.toHex() }]
            }
            cache.push(utxo);
            if (amount) {
                satoshis = cache.reduce((a, curr) => { return a + curr.value }, 0);
                if (satoshis >= amount) {
                    return cache.map(utxo => {
                        return { satoshis: utxo.value, vout: utxo.tx_pos, txid: utxo.tx_hash, script: script.toHex() }
                    });
                }
                else if (satoshis === amount || between(amount, satoshis - P2PKH_INPUT_SIZE, satoshis + P2PKH_INPUT_SIZE)) {
                    return cache.map(utxo => {
                        return { satoshis: utxo.value, vout: utxo.tx_pos, txid: utxo.tx_hash, script: script.toHex() }
                    })
                }
            } else {
                return utxos.map(utxo => {
                    return { satoshis: utxo.value, vout: utxo.tx_pos, txid: utxo.tx_hash, script: script.toHex() }
                });
            }
        }
    }
    return [];
}
const payForRawTx = async rawtx => {
    const bsvtx = bsv.Transaction(rawtx);
    const satoshis = bsvtx.outputs.reduce(((t, e) => t + e._satoshis), 0);
    const txFee = parseInt(((bsvtx._estimateSize() + P2PKH_INPUT_SIZE) * FEE_FACTOR)) + 1;
    const utxos = await getPaymentUTXOs(ADDRESS_STRING, satoshis + txFee);
    if (!utxos.length) { throw `Insufficient funds` }
    bsvtx.from(utxos);
    const inputSatoshis = utxos.reduce(((t, e) => t + e.satoshis), 0);
    bsvtx.to(ADDRESS_STRING, inputSatoshis - satoshis - txFee);
    bsvtx.sign(bsv.PrivateKey.fromWIF(PK_WIF));
    return bsvtx.toString();
}
exports.payForRawTx = payForRawTx;