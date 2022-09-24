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
class PayToPublicKeyLock {
  constructor(pubkey) { this.pubkey = pubkey }
  script() { return asm(`${this.pubkey} OP_CHECKSIG`) }
  domain() { return 74 }
}
PayToPublicKeyLock.deps = { asm }