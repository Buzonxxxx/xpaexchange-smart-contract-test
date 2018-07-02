const assert = require('assert')
const ganache = require('ganache-cli')
const Web3 = require('web3')
const Deploy = require('./lib/deploy.js')
const XPAAssetsLib = require('./lib/XPAAssets.lib')
const StandardTokenLib = require('./lib/StandardToken.lib.js')
const XPAAssetTokenLib = require('./lib/XPAAssetToken.lib.js')
const BalivLib = require('./lib/Baliv.lib.js')

const web3 = new Web3(ganache.provider())
const dp = new Deploy(web3)
const BN = web3.utils.BN

const reset = async () => {
  lib = await dp.deploy()
  XPAAssets = new XPAAssetsLib(web3, lib)
  StandardToken = new StandardTokenLib(web3, lib)
  USXToken = new XPAAssetTokenLib(web3, lib, lib.USXTokenContract)
  TWXToken = new XPAAssetTokenLib(web3, lib, lib.TWXTokenContract)
  Baliv = new BalivLib(web3, lib)
}
const numToString = num => num * 1000 + new Array(15).fill(0).join('')

before(async () => {
  await reset()
})

describe('質押借貸自動化測試', function () {
  this.slow(1000)
  describe('部署合約並設置地址連動', () => {
    it('部署StandardToken, Baliv, TokenFactory, FundAccount, XPAAssets, XPAAssetToken', () => {
      assert.ok(lib.StandardTokenAddress)
      assert.ok(lib.BalivAddress)
      assert.ok(lib.TokenFactoryAddress)
      assert.ok(lib.FundAccountAddress)
      assert.ok(lib.XPAAssetsAddress)
      assert.ok(lib.USXTokenContractAddress)
      assert.ok(lib.TWXTokenContractAddress)
    })
    it('TokenFactory設XPAAssets地址', async () => {
      assert.equal(await lib.TokenFactory.methods.XPAAssets().call(), lib.XPAAssetsAddress)
    })
    it('TokenFactory設FundAccount地址', async () => {
      assert.equal(await lib.TokenFactory.methods.fundAccounts(0).call(), lib.FundAccountAddress)
    })
    it('XPAAssets設FundAccount地址', async () => {
      assert.equal(await lib.XPAAssets.methods.fundAccount().call(), lib.FundAccountAddress)
    })
    it('FundAccount指定XPAAssets為Operator', async () => {
      assert.equal(await lib.FundAccount.methods.operators(1).call(), lib.XPAAssetsAddress)
    })
  })
})