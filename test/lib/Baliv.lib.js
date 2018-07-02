class BalivLib {
  constructor(web3, lib){
    this.web3 = web3
    this.lib = lib
  }
  async userTakeOrder(sender, fromToken, toToken, price, amount, representor) {
    await lib.Baliv.methods.userTakeOrder(fromToken, toToken, this.web3.utils.toWei(price, 'ether'), this.web3.utils.toWei(amount, 'ether'), representor)
      .send({ from: sender, gas: '4700000' })
  }
}
  module.exports = BalivLib