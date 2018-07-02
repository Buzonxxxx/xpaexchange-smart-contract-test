class XPAAssetsLib {
  constructor(web3, lib){
    this.web3 = web3
    this.lib = lib
  }
  async setFeeRate(
    withdrawFeeRate, 
    offsetFeeRate, 
    forceOffsetBasicFeeRate, 
    forceOffsetExecuteFeeRate, 
    forceOffsetExtraFeeRate, 
    forceOffsetExecuteMaxFee, 
    sender
    ) {
    await this.lib.XPAAssets.methods.setFeeRate(
      this.web3.utils.toWei(withdrawFeeRate, 'ether'), 
      this.web3.utils.toWei(offsetFeeRate, 'ether'),
      this.web3.utils.toWei(forceOffsetBasicFeeRate, 'ether'),
      this.web3.utils.toWei(forceOffsetExecuteFeeRate, 'ether'), 
      this.web3.utils.toWei(forceOffsetExtraFeeRate, 'ether'),
      this.web3.utils.toWei(forceOffsetExecuteMaxFee, 'ether')
    )
    .send({ from: sender, gas: '4700000' })
  }
  async mortgageXPA(sender) {
    await this.lib.XPAAssets.methods.mortgage(0)
      .send({ from: sender })
  }
  async withdrawToken(sender, tokenAddress, amount) {
    await lib.XPAAssets.methods.withdraw(tokenAddress, this.web3.utils.toWei(amount, 'ether'), 0)
      .send({ from: sender, gas: '4700000' })
  }
  async repayToken(sender, tokenAddress, amount) {    
    await lib.XPAAssets.methods.repayment(tokenAddress, this.web3.utils.toWei(amount, 'ether'), 0)
    .send({ from: sender })
  }
  async offset(sender, account, tokenAddress) {
    await lib.XPAAssets.methods.offset(account, tokenAddress)
      .send({ from: sender, gas: '4700000' })
  }
  async withdrawXPA(sender, amount) {
    await lib.XPAAssets.methods.withdrawXPA(this.web3.utils.toWei(amount, 'ether'), 0)
      .send({ from: sender, gas: '4700000' })
  }
  async getHighestMortgageRate() {
    return await lib.XPAAssets.methods.getHighestMortgageRate().call()
  }
  async getMortgageRate(account) {
    return await lib.XPAAssets.methods.getMortgageRate(account).call()
  }
  async getFromAmountBooks(account) {
    return await lib.XPAAssets.methods.getFromAmountBooks(account).call()
  }
  async fromAmountBooks(account) {
    return await lib.XPAAssets.methods.fromAmountBooks(account).call()
  }
  async getRemainingAmount(account, tokenAddress) {
    return await lib.XPAAssets.methods.getRemainingAmount(account, tokenAddress).call()
  }
  async getUsableXPA(account){
    return await lib.XPAAssets.methods.getUsableXPA(account).call()
  }
  async toAmountBooks(account, tokenAddress){
    return await lib.XPAAssets.methods.toAmountBooks(account, tokenAddress).call()
  }
  async getLoanAmount(account, tokenAddress){
    return await lib.XPAAssets.methods.getLoanAmount(account, tokenAddress).call()
  }
  async profit() {
    return await lib.XPAAssets.methods.profit().call()
  }
  async unPaidFundAccount(tokenAddress) {
    return await lib.XPAAssets.methods.unPaidFundAccount(tokenAddress).call()
  }
  async burnFundAccount(sender, tokenAddress, amount) {
    await lib.XPAAssets.methods.burnFundAccount(tokenAddress, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: sender, gas: '4700000' })
  }
  async assignBank(sender, bank) {
    await lib.XPAAssets.methods.assignBank(bank)
      .send({ from: sender, gas: '4700000' })
  }
  async transferProfit(sender, tokenAddress, amount) {
    await lib.XPAAssets.methods.transferProfit(tokenAddress, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: sender, gas: '4700000' })
  }
  async migrate(sender, newContractAddress) {
    await lib.XPAAssets.methods.migrate(newContractAddress)
      .send({ from: sender, gas: '4700000' })
  }
  async migratingAmountBooks(sender, account, newContractAddress){
    await lib.XPAAssets.methods.migratingAmountBooks(account, newContractAddress)
      .send({ from: sender, gas: '4700000' })
  }
  async withdrawFeeRate() {
    return await lib.XPAAssets.methods.withdrawFeeRate().call()
  }
  async offsetFeeRate(){
    return await lib.XPAAssets.methods.offsetFeeRate().call()
  }
  async forceOffsetBasicFeeRate() {
    return await lib.XPAAssets.methods.forceOffsetBasicFeeRate().call()
  }
  async forceOffsetExecuteFeeRate() {
    return await lib.XPAAssets.methods.forceOffsetExecuteFeeRate().call()
  }
  async forceOffsetExtraFeeRate() {
    return await lib.XPAAssets.methods.forceOffsetExtraFeeRate().call()
  }
  async forceOffsetExecuteMaxFee() {
    return await lib.XPAAssets.methods.forceOffsetExecuteMaxFee().call()
  }
  async createToken(sender, tokenSymbol, tokenName, defaultExchangeRate) {
    await lib.XPAAssets.methods.createToken(tokenSymbol, tokenName, defaultExchangeRate)
    .send({ from: sender, gas: '4700000' })
  }
  async xpaAsset(index) {
    return await lib.XPAAssets.methods.xpaAsset(index).call()
  }
  async getPrice(tokenAddress) {
    return await lib.XPAAssets.methods.getPrice(tokenAddress).call()
  }
  async getClosingLine() {
    return await lib.XPAAssets.methods.getClosingLine().call()
  }
}
module.exports = XPAAssetsLib

