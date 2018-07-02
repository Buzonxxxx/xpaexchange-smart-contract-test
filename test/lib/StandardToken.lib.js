class StandardTokenLib {
  constructor(web3, lib){
    this.web3 = web3
    this.lib = lib
  }
  async allowance(account, contractAddress) {
    return await lib.StandardToken.methods.allowance(account, contractAddress).call()
  }
  async balanceOf(contractAddress){
    return await lib.StandardToken.methods.balanceOf(contractAddress).call()
  }
  async approve(sender, contractAddress, amount) {
    await lib.StandardToken.methods.approve(contractAddress, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: sender, gas: '4700000' })
  }
}
  module.exports = StandardTokenLib