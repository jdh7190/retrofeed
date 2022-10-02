const { asm } = Run.extra;
const initRun = () => {
    const run = new Run({
        owner: localStorage.ownerKey,
        api,
        timeout: 30000
    });
    trustlist.forEach(t => { run.trust(t.slice(0, 64)) })
    return run;
}
class P2PKLock {
  constructor(pubkey) { this.pubkey = pubkey }
  script() { return asm(`${this.pubkey} OP_CHECKSIG`) }
  domain() { return 74 }
}
/* class retroFeedWallet {
  constructor(publicKey) {
      if (!publicKey) throw `Must specify public key!`;
      this.publicKey = publicKey;
  }
  async nextOwner() {
      return this.publicKey;
  }
  async sign(rawtx, parents, locks) {
      const tx = bsv.Transaction(rawtx);
      for (let i = 0; i < tx.inputs.length; i++) {
        if (locks[i] instanceof P2PKLock) {
          console.log(locks[i])
          const sighashType = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;
          const scriptCode = bsv.Script.fromHex(lockTokenScript);
          const value = new bsv.crypto.BN(satoshis);
          const s = bsv.Transaction.sighash.sign(tx, privkey, sighashType, inputIndex, scriptCode, value).toTxFormat();
          tx.inputs[i].setScript(s.toString('hex'));
        }
      }
      return tx.toString();
  }
}
P2PKLock.deps = { asm }
const test = async() => {
  const run = initRun();
  const utxos = await run.blockchain.utxos(run.owner.address);
  if (utxos?.length) {
      for (const utxo of utxos) {
        const jig = await run.load(`${utxo.txid}_o${utxo.vout}`);
        console.log(jig.location)
      }
  }
  const jig = await run.load('8bbab54e3d3350c781228f0c0ad27bdba7642ab4ae297fa5a308278ca44c6877_o1');
  const tx = new Run.Transaction();
  tx.update(() => {
    jig.send(new P2PKLock(localStorage.ownerPublicKey))
  })
  const raw = await tx.export();
  console.log(raw)
} */