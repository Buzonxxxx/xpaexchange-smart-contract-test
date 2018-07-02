class XPAAssetTokenLib {
  constructor(web3, lib, token){
    this.web3 = web3
    this.lib = lib
    this.tokenContract = token
  }
  async name() {
    return await this.tokenContract.methods.name().call()
  }
  async symbol() {
    return await this.tokenContract.methods.symbol().call()
  }
  async balanceOf(account) {
    return await this.tokenContract.methods.balanceOf(account).call()
  }
  async totalSupply() {
    return await this.tokenContract.methods.totalSupply().call()
  }
  async approve(sender, contractAddress, amount) {
    await this.tokenContract.methods.approve(contractAddress, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: sender, gas: '4700000' })
  }
  async transfer(sender, contractAddress, amount) {
    await this.tokenContract.methods.transfer(contractAddress, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: sender, gas: '4700000' })
  }
}
module.exports = XPAAssetTokenLib