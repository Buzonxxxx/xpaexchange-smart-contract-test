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
  describe('建立測試token', () => {
    it('Operator建立測試Token, name: "USXToken", symbol: "USX"', async () => {
      assert.equal(await USXToken.name(), 'USXToken')
      assert.equal(await USXToken.symbol(), 'USX')
    })
    it('檢查非operator不能建Token', async () => {
      try {
        await XPAAssets.createToken(lib.accounts[1], "GG", "TestToken", 0)
      } catch (err) {
        assert(err)
        return
      }
      assert(false)
    })
    it('檢查不能建一樣symbol的token', async () => {
      await XPAAssets.createToken(lib.accounts[0], "USX", "testToken", 0)
      assert.equal(await XPAAssets.xpaAsset(0), lib.USXTokenAddress)
      assert.notEqual(await XPAAssets.xpaAsset(1), lib.USXTokenAddress)
    })
  })

  describe('調整手續費', () => {
    before(async () => {
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.01',
        forceOffsetExecuteFeeRate = '0.005',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '500',
        accounts = lib.accounts[0]
      )
    })
    it('調整提領手續費為1%', async () => {
      assert.equal(await XPAAssets.withdrawFeeRate(), web3.utils.toWei('0.01', 'ether'))
    })
    it('調整平倉手續費為1%', async () => {
      assert.equal(await XPAAssets.offsetFeeRate(), web3.utils.toWei('0.01', 'ether'))
    })
    it('調整強平基本手續費1%', async () => {
      assert.equal(await XPAAssets.forceOffsetBasicFeeRate(), web3.utils.toWei('0.01', 'ether'))
    })
    it('調整強平執行手續費為0.5%', async () => {
      assert.equal(await XPAAssets.forceOffsetExecuteFeeRate(), web3.utils.toWei('0.005', 'ether'))
    })
    it('調整強平額外手續費為2%', async () => {
      assert.equal(await XPAAssets.forceOffsetExtraFeeRate(), web3.utils.toWei('0.02', 'ether'))
    })
    it('調整強平手續費上限為500XPA', async () => {
      assert.equal(await XPAAssets.forceOffsetExecuteMaxFee(), web3.utils.toWei('500', 'ether'))
    })
    it('檢查非Operator不能調整手續費', async () => {
      try {
        await XPAAssets.setFeeRate(
          withdrawFeeRate = '0.01',
          offsetFeeRate = '0.01',
          forceOffsetBasicFeeRate = '0.01',
          forceOffsetExecuteFeeRate = '0.005',
          forceOffsetExtraFeeRate = '0.02',
          forceOffsetExecuteMaxFee = '500',
          accounts = lib.accounts[1]
        )
      } catch (err) {
        assert(err)
        return
      }
      assert(false)
    })
  })

  describe('抵押XPA', () => {
    it('檢查不能抵押小於100XPA的數量', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '99')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      //用戶XPA balance 99, XPAAssets balance 0, getFromAmountBooks/fromAmountBooks 0, 最高抵押率為10%, 用戶抵押率為0%
      assert.strictEqual(await StandardToken.allowance(lib.accounts[0], lib.XPAAssetsAddress), numToString(99))
      assert.strictEqual(await StandardToken.balanceOf(lib.XPAAssetsAddress), '0')
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), '0')
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), '0')
      assert.strictEqual(await XPAAssets.getHighestMortgageRate(), numToString(0.1))
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), '0')
    })
    it('抵押20000XPA', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '20000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      //用戶XPA balance 0, XPAAssets balance 20000, getFromAmountBooks/fromAmountBooks 20000, 最高抵押率為10%, 用戶抵押率為0%
      assert.strictEqual(await StandardToken.allowance(lib.accounts[0], lib.XPAAssetsAddress), '0')
      assert.strictEqual(await StandardToken.balanceOf(lib.XPAAssetsAddress), numToString(20000))
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(20000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(20000))
      assert.strictEqual(await XPAAssets.getHighestMortgageRate(), numToString(0.1))
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), '0')
    })
  })

  describe('提領測試token', () => {
    it('建立測試token', async () => {
      assert.ok(lib.USXTokenAddress)
    })
    it('可提領XPA為20000, 可提領token為20', async () => {
      //20000*0.01*0.1 = 20
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), numToString(20))
      assert.strictEqual(await XPAAssets.getUsableXPA(lib.accounts[0]), numToString(20000))
    })
    it('檢查不能提領數量小於1的token', async () => {
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '-1')
      assert.strictEqual(await USXToken.balanceOf(lib.accounts[0]), '0')
    })
    it('提領20token', async () => {
      // 用戶抵押率為10%(到達最高抵押率10%), toAmountBooks/getLoanAmount借貸紀錄為20
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '20')
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), numToString(0.1))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(20))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(20))
    })
    it('提領手續費為0.2, 使用者錢包token數量為19.8, token總發行量增加20', async () => {
      assert.strictEqual(await USXToken.balanceOf(lib.XPAAssetsAddress), numToString(0.2))
      assert.strictEqual(await USXToken.balanceOf(lib.accounts[0]), numToString(19.8))
      assert.strictEqual(await USXToken.totalSupply(), numToString(20))
    })
    it('可提領XPA為0, 可提領token為0', async () => {
      assert.strictEqual(await XPAAssets.getUsableXPA(lib.accounts[0]), '0')
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
    it('檢查用戶不能再提領token', async () => {
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '20')
      assert.strictEqual(await USXToken.balanceOf(lib.accounts[0]), numToString(19.8))
    })
  })

  describe('歸還測試token', () => {
    //抵押20000, 借貸20
    it('歸還0.01, 用戶借貸記錄變19.99, 可提領token變0.01, token總發行量減少0.01', async () => {
      await USXToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0.01')
      await XPAAssets.repayToken(lib.accounts[0], lib.USXTokenAddress, '0.01')
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(19.99))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(19.99))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), numToString(0.01))
      assert.strictEqual(await USXToken.totalSupply(), numToString(19.99))
    })
    it('使用者錢包token數量為19.79', async () => {
      // 19.8 - 0.01
      assert.strictEqual(await USXToken.balanceOf(lib.accounts[0]), numToString(19.79))
    })
    it('可提領XPA為10', async () => {
      // 0.01/0.01/0.1 = 10
      assert.strictEqual(await XPAAssets.getUsableXPA(lib.accounts[0]), numToString(10))
    })
    it('可提領XPA低於100, 不能提領', async () => {
      beforeUserXPA = await StandardToken.balanceOf(lib.accounts[0])
      await XPAAssets.withdrawXPA(lib.accounts[0], '10')
      afterUserXPA = await StandardToken.balanceOf(lib.accounts[0])
      assert.strictEqual(beforeUserXPA, afterUserXPA)
    })
    it('歸還9.99token, 抵押率變5%, 可提領XPA變10000, 可提領token變10, token總發行量變10,', async () => {
      await USXToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '9.99')
      await XPAAssets.repayToken(lib.accounts[0], lib.USXTokenAddress, '9.99')
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), numToString(0.05))
      assert.strictEqual(await XPAAssets.getUsableXPA(lib.accounts[0]), numToString(10000))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), numToString(10))
      assert.strictEqual(await USXToken.totalSupply(), numToString(10))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(10))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(10))
    })
  })

  describe('主動平倉(平倉金額小於100萬)', () => {
    before(async () => {
      await XPAAssets.offset(lib.accounts[0], lib.accounts[0], lib.USXTokenAddress)
    })
    //抵押20000, 借貸10, 需平1010XPA(1%手續費)	
    it('執行平倉, 用戶抵押率變為0%', async () => {
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), '0')
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), '0')
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
    it('平倉基金增加1000, 收益增加10, 待銷毀token增加10', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(1000))
      assert.strictEqual(await XPAAssets.profit(), numToString(10))
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(10))
    })
    it('XPA抵押品價值為18990', async () => {
      //20000 - (10*1.01)/0.01 = 18990
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(18990))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(18990))
    })
    it('可提領Token為18.99', async () => {
      //18990*0.01*0.1
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), numToString(18.99))
    })
    it('提領XPA1000', async () => {
      beforeUserXPA = await StandardToken.balanceOf(lib.accounts[0])
      await XPAAssets.withdrawXPA(lib.accounts[0], '1000')
      afterUserXPA = await StandardToken.balanceOf(lib.accounts[0])
      XPADiff = new BN(afterUserXPA).sub(new BN(beforeUserXPA)).toString(10)
      assert.strictEqual(XPADiff, numToString(1000))
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(17990))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(17990))
    })
  })

  describe('主動平倉(平倉金額超過100萬上限)', () => {
    //抵押兩千萬, 提領兩萬, 需平兩百萬, 超過最大額度, 最多平一百萬
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.01',
        forceOffsetExecuteFeeRate = '0.005',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '500',
        accounts = lib.accounts[0]
      )
    })
    it('抵押兩千萬XPA', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '20000000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(20000000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(20000000))
    })
    it('提領兩萬token, 用戶抵押率為10%(到達最高抵押率10%), token總發行量變20000', async () => {
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '20000')
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), numToString(0.1))
      assert.strictEqual(await USXToken.totalSupply(), numToString(20000))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(20000))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(20000))
    })
    it('執行平倉, 平掉一百萬XPA, 借貸紀錄變10100, 平掉9900token', async () => {
      await XPAAssets.offset(lib.accounts[0], lib.accounts[0], lib.USXTokenAddress)
      // 10100/0.01/19000000 = 0.053157894736842105
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), '53157894736842105')
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(10100))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(10100))
    })
    it('平倉基金增加99萬, 收益增加1萬, 待銷毀token增加9900', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(990000))
      assert.strictEqual(await XPAAssets.profit(), numToString(10000))
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(9900))
    })
    it('XPA抵押品價值為一千九百萬', async () => {
      //20000000 - 1000000 = 19000000
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(19000000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(19000000))
    })
    it('可提領Token為8900', async () => {
      //19000000 * 0.01 * 0.1 - 10100 = 8900
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), numToString(8900))
    })
    it('可提領XPA為890萬', async () => {
      //19000000 - (10100/0.01/0.1) = 8900000
      assert.strictEqual(await XPAAssets.getUsableXPA(lib.accounts[0]), numToString(8900000))
    })
  })

  describe('銷毀token', () => {
    it('移轉10token到平倉基金', async () => {
      //從accounts[0]轉10token到FundAccount
      await USXToken.approve(lib.accounts[0], lib.FundAccountAddress, '10')
      await USXToken.transfer(lib.accounts[0], lib.FundAccountAddress, '10')
      assert.strictEqual(await USXToken.balanceOf(lib.FundAccountAddress), numToString(10))
    })
    it('銷毀10token', async () => {
      //totalSupply 20000 => 19990, unpaidFundAccount 9900 => 9890 
      await XPAAssets.burnFundAccount(lib.accounts[0], lib.USXTokenAddress, '10')
      assert.strictEqual(await USXToken.totalSupply(), numToString(19990))
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(9890))
    })
  })

  describe('轉出收益到bank', () => {
    it('XPAAssets轉出XPA總收益10000到bank ', async () => {
      beforeTransferXPAProfit = new BN(await StandardToken.balanceOf(lib.XPAAssetsAddress))
      await XPAAssets.assignBank(lib.accounts[0], lib.accounts[1])
      await XPAAssets.transferProfit(lib.accounts[0], lib.StandardTokenAddress, '10000')
      afterTransferXPAProfit = new BN(await StandardToken.balanceOf(lib.XPAAssetsAddress))
      // XPAAssets減少了10000XPA
      XPAProfitDiff = afterTransferXPAProfit.sub(beforeTransferXPAProfit).toString(10)
      assert.strictEqual(XPAProfitDiff, numToString(-10000))
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(10000))
      assert.strictEqual(await XPAAssets.profit(), '0')

    })
    it('XPAAssets轉出test token總收益200到bank ', async () => {
      await XPAAssets.transferProfit(lib.accounts[0], lib.USXTokenAddress, '200')
      assert.strictEqual(await USXToken.balanceOf(lib.accounts[1]), numToString(200))
      assert.strictEqual(await USXToken.balanceOf(lib.XPAAssetsAddress), '0')
    })
  })

  describe('移轉質押借貸合約', () => {
    before(async () => {
      oldXPABalance = await StandardToken.balanceOf(lib.XPAAssetsAddress)
      oldUnPaidFundAccount = await XPAAssets.unPaidFundAccount(lib.USXTokenAddress)
      oldProfit = await XPAAssets.profit()
    })
    it('部署新XPAAssets', async () => {
      assert.ok(lib.newXPAAssetsAddress)
    })
    it('新XPAAssets指定舊XPAAssets為Operator', async () => {
      await lib.newXPAAssets.methods.assignOperator(lib.XPAAssetsAddress)
        .send({ from: lib.accounts[0] })
      assert.equal(await lib.newXPAAssets.methods.operator().call(), lib.XPAAssetsAddress)
    })
    it('新XPAAssets設FundAccount地址', async () => {
      await lib.newXPAAssets.methods.setFundAccount(lib.FundAccountAddress)
        .send({ from: lib.accounts[0] })
      assert.equal(await lib.newXPAAssets.methods.fundAccount().call(), lib.FundAccountAddress)
    })
    it('舊XPAAssets執行migrate', async () => {
      await XPAAssets.migrate(lib.accounts[0], lib.newXPAAssetsAddress)
      assert.equal(await lib.XPAAssets.methods.newXPAAssets().call(), lib.newXPAAssetsAddress)
    })
    it('移轉test token', async () => {
      newUSXTokenAddress = await lib.newXPAAssets.methods.xpaAsset(0).call()
      assert.equal(lib.USXTokenAddress, newUSXTokenAddress)
    })
    it('執行migratingAmountBooks', async () => {
      await XPAAssets.migratingAmountBooks(lib.accounts[0], lib.accounts[0], lib.newXPAAssetsAddress)
      assert.ok(await lib.newXPAAssets.methods.migrateBooks(lib.accounts[0]).call())
    })
    it('移轉toAmountBooks', async () => {
      oldToAmountBook = await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress)
      newToAmountBook = await lib.newXPAAssets.methods.toAmountBooks(lib.accounts[0], newUSXTokenAddress).call()
      assert.equal(oldToAmountBook, newToAmountBook)
    })
    it('移轉fromAmountBooks', async () => {
      oldFromAmountBook = await XPAAssets.fromAmountBooks(lib.accounts[0])
      newFromAmountBook = await lib.newXPAAssets.methods.fromAmountBooks(lib.accounts[0]).call()
      assert.equal(oldFromAmountBook, newFromAmountBook)
    })
    it('migrate後新舊合約XPA數量一致', async () => {
      newXPABalance = await StandardToken.balanceOf(lib.newXPAAssetsAddress)
      assert.equal(oldXPABalance, newXPABalance)
    })
    it('migrate後新舊合約unPaidFundAccount數量一致', async () => {
      newUnPaidFundAccount = await lib.newXPAAssets.methods.unPaidFundAccount(lib.USXTokenAddress).call()
      assert.equal(oldUnPaidFundAccount, newUnPaidFundAccount)
    })
    it('migrate後新舊合約profit數量一致', async () => {
      newProfit = await lib.newXPAAssets.methods.profit().call()
      assert.equal(oldProfit, newProfit)
    })
  })

  describe('檢查匯率是否跟交易連動', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.01',
        forceOffsetExecuteFeeRate = '0.005',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '500',
        accounts = lib.accounts[0]
      )
    })
    it('抵押10000XPA, 提領10token', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '10000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await StandardToken.allowance(lib.accounts[0], lib.XPAAssetsAddress), '0')
      assert.strictEqual(await StandardToken.balanceOf(lib.XPAAssetsAddress), numToString(10000))
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(10000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(10000))
      assert.strictEqual(await XPAAssets.getHighestMortgageRate(), numToString(0.1))
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), '0')

      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '10')
      assert.strictEqual(await XPAAssets.getMortgageRate(lib.accounts[0]), numToString(0.1))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(10))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(10))

    })
    it('掛單交易XPA/TT 0.002', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.002', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '500', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.002))
    })
  })

  describe('強制平倉(抵押品價值大於100萬, 借USX, USX沒平完)', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.02',
        forceOffsetExecuteFeeRate = '0.01',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '2000',
        accounts = lib.accounts[0]
      )
    })
    it('抵押120萬, 提領500USX, 500TWX', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '1200000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(1200000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(1200000))
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '1000')
      
      assert.strictEqual(await USXToken.totalSupply(), numToString(1000))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(1000))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(1000))
    })
    it('匯率變動導致抵押率超過平倉線(XPA大幅貶值)', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order 匯率0.001
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.001))
    })
    it('執行強制平倉', async () => {
      await XPAAssets.offset(lib.accounts[1], lib.accounts[0], lib.USXTokenAddress)
    })
    it('120萬平掉10%(12萬), 剩108萬', async () => {
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(1080000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(1080000))
    })
    it('平掉114USX, 剩餘886USX', async () => {
      //強平執行費1% 1200,強平基本費2% 2400, 強平額外手續費2% 2400
      //實際平倉金額(120000) - 全部手續費(6000) = 114000
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(114))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(886))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(886))
    })
    it('執行者收取1%執行費', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(1200))
    })
    it('平倉基金增加114000 + 2400(強平額外手續費2%) = 116400', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(116400))
      assert.strictEqual(await XPAAssets.profit(), numToString(2400))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
    
  })

  describe('強制平倉(抵押品價值小於100萬, 借USX, USX沒平完)', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.02',
        forceOffsetExecuteFeeRate = '0.01',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '2000',
        accounts = lib.accounts[0]
      )
    })
    it('抵押50萬, 提領500USX', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '500000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(500000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(500000))

      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '500')
      assert.strictEqual(await USXToken.totalSupply(), numToString(500))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(500))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(500))
    })
    it('匯率變動導致抵押率超過平倉線(XPA大幅貶值)', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order 匯率0.001
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.001))
    })
    it('執行強制平倉', async () => {
      await XPAAssets.offset(lib.accounts[1], lib.accounts[0], lib.USXTokenAddress)
    })
    it('50萬平掉10%(5萬), 剩45萬', async () => {
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(450000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(450000))
    })
    it('平掉47.5USX, 剩餘452.5USX', async () => {
      //強平執行費1% 500,強平基本費2% 1000, 強平額外手續費2% 1000
      //債務等值XPA(50000) - 全部手續費(2500) = 47500
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(47.5))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(452.5))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(452.5))
    })
    it('執行者收取1%執行費', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(500))
    })
    it('平倉基金增加47500 + 1000(強平額外手續費2%) = 48500', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(48500))
      assert.strictEqual(await XPAAssets.profit(), numToString(1000))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
  })

  describe('強制平倉(抵押品價值大於100萬, 借USX/TWX, USX沒平完)', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.02',
        forceOffsetExecuteFeeRate = '0.01',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '2000',
        accounts = lib.accounts[0]
      )
    })
    it('抵押120萬, 提領500USX, 500TWX', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '1200000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(1200000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(1200000))
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '500')
      await XPAAssets.withdrawToken(lib.accounts[0], lib.TWXTokenAddress, '500')
      assert.strictEqual(await USXToken.totalSupply(), numToString(500))
      assert.strictEqual(await TWXToken.totalSupply(), numToString(500))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(500))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.TWXTokenAddress), numToString(500))
    })
    it('匯率變動導致抵押率超過平倉線(XPA大幅貶值)', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '2')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order 匯率0.001
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.TWXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.TWXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.001))
      assert.strictEqual(await XPAAssets.getPrice(lib.TWXTokenAddress), numToString(0.001))
    })
    it('執行強制平倉', async () => {
      await XPAAssets.offset(lib.accounts[1], lib.accounts[0], 0)
    })
    it('120萬平掉10%(12萬), 剩108萬', async () => {
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(1080000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(1080000))
    })
    it('平掉114USX, 剩餘386USX', async () => {
      //強平執行費1% 1200,強平基本費2% 2400, 強平額外手續費2% 2400
      //實際平倉金額(120000) - 全部手續費(6000) = 114000
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(114))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(386))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(386))
    })
    it('執行者收取1%執行費', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(1200))
    })
    it('平倉基金增加114000 + 2400(強平額外手續費2%) = 116400', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(116400))
      assert.strictEqual(await XPAAssets.profit(), numToString(2400))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
  })

  describe('強制平倉(抵押品價值大於100萬, 借USX/TWX, USX平完, TWX沒平完)', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.02',
        forceOffsetExecuteFeeRate = '0.01',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '2000',
        accounts = lib.accounts[0]
      )
    })
    it('抵押120萬, 提領100USX, 900TWX', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '1200000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(1200000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(1200000))
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '100')
      await XPAAssets.withdrawToken(lib.accounts[0], lib.TWXTokenAddress, '900')
      assert.strictEqual(await USXToken.totalSupply(), numToString(100))
      assert.strictEqual(await TWXToken.totalSupply(), numToString(900))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(100))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.TWXTokenAddress), numToString(900))
    })
    it('匯率變動導致抵押率超過平倉線(XPA大幅貶值)', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '2')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order 匯率0.001
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.TWXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.TWXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.001))
      assert.strictEqual(await XPAAssets.getPrice(lib.TWXTokenAddress), numToString(0.001))
    })
    it('執行強制平倉', async () => {
      await XPAAssets.offset(lib.accounts[1], lib.accounts[0], 0)
    })
    it('120萬平掉10%(12萬), 剩108萬', async () => {
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(1080000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(1080000))
    })
    it('平掉100USX, 14TWX', async () => {
      //強平執行費1% 1200,強平基本費2% 2400, 強平額外手續費2% 2400
      //實際平倉金額(120000) - 全部手續費(6000) = 114000
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(100))
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.TWXTokenAddress), numToString(14))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), '0')
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), '0')
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.TWXTokenAddress), numToString(886))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.TWXTokenAddress), numToString(886))
    })
    it('執行者收取1%執行費', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(1200))
    })
    it('平倉基金增加114000 + 2400(強平額外手續費2%) = 116400', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(116400))
      assert.strictEqual(await XPAAssets.profit(), numToString(2400))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
  })

  describe('強制平倉(抵押品價值小於100萬, 借USX/TWX, USX沒平完)', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.02',
        forceOffsetExecuteFeeRate = '0.01',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '2000',
        accounts = lib.accounts[0]
      )
    })
    it('抵押50萬, 提領200USX, 200TWX', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '500000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(500000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(500000))
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '200')
      await XPAAssets.withdrawToken(lib.accounts[0], lib.TWXTokenAddress, '200')
      assert.strictEqual(await USXToken.totalSupply(), numToString(200))
      assert.strictEqual(await TWXToken.totalSupply(), numToString(200))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(200))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.TWXTokenAddress), numToString(200))
    })
    it('匯率變動導致抵押率超過平倉線(XPA大幅貶值)', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '2')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order 匯率0.001
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.TWXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.TWXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.001))
      assert.strictEqual(await XPAAssets.getPrice(lib.TWXTokenAddress), numToString(0.001))
    })
    it('執行強制平倉', async () => {
      await XPAAssets.offset(lib.accounts[1], lib.accounts[0], 0)
    })
    it('50萬平掉10%(5萬), 剩45萬', async () => {
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(450000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(450000))
    })
    it('平掉47.5USX, 剩餘152.5USX', async () => {
      //強平執行費1% 500,強平基本費2% 1000, 強平額外手續費2% 1000
      //實際平倉金額(50000) - 全部手續費(2500) = 47500
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(47.5))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), numToString(152.5))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(152.5))
    })
    it('執行者收取1%執行費', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(500))
    })
    it('平倉基金增加47500 + 1000(強平額外手續費2%) = 48500', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(48500))
      assert.strictEqual(await XPAAssets.profit(), numToString(1000))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
  })

  describe('強制平倉(抵押品價值小於100萬, 借USX/TWX, USX平完, TWX沒平完)', () => {
    before(async () => {
      await reset()
      await XPAAssets.setFeeRate(
        withdrawFeeRate = '0.01',
        offsetFeeRate = '0.01',
        forceOffsetBasicFeeRate = '0.02',
        forceOffsetExecuteFeeRate = '0.01',
        forceOffsetExtraFeeRate = '0.02',
        forceOffsetExecuteMaxFee = '2000',
        accounts = lib.accounts[0]
      )
    })
    it('抵押50萬, 提領20USX, 300TWX', async () => {
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.XPAAssetsAddress, '500000')
      await XPAAssets.mortgageXPA(lib.accounts[0])
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(500000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(500000))
      await XPAAssets.withdrawToken(lib.accounts[0], lib.USXTokenAddress, '20')
      await XPAAssets.withdrawToken(lib.accounts[0], lib.TWXTokenAddress, '300')
      assert.strictEqual(await USXToken.totalSupply(), numToString(20))
      assert.strictEqual(await TWXToken.totalSupply(), numToString(300))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), numToString(20))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.TWXTokenAddress), numToString(300))
    })
    it('匯率變動導致抵押率超過平倉線(XPA大幅貶值)', async () => {
      // approve
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await StandardToken.approve(lib.accounts[0], lib.BalivAddress, '2')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await USXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '0')
      await TWXToken.approve(lib.accounts[0], lib.BalivAddress, '1')
      // take order 匯率0.001
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.USXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.USXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.StandardTokenAddress, lib.TWXTokenAddress, '0.001', '1', 0)
      await Baliv.userTakeOrder(lib.accounts[0], lib.TWXTokenAddress, lib.StandardTokenAddress, '1000', '1', 0)
      assert.strictEqual(await XPAAssets.getPrice(lib.USXTokenAddress), numToString(0.001))
      assert.strictEqual(await XPAAssets.getPrice(lib.TWXTokenAddress), numToString(0.001))
    })
    it('執行強制平倉', async () => {
      await XPAAssets.offset(lib.accounts[1], lib.accounts[0], 0)
    })
    it('50萬平掉10%(5萬), 剩45萬', async () => {
      assert.strictEqual(await XPAAssets.fromAmountBooks(lib.accounts[0]), numToString(450000))
      assert.strictEqual(await XPAAssets.getFromAmountBooks(lib.accounts[0]), numToString(450000))
    })
    it('平掉20USX, 27.5TWX', async () => {
      //強平執行費1% 500,強平基本費2% 1000, 強平額外手續費2% 1000
      //實際平倉金額(50000) - 全部手續費(2500) = 47500
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.USXTokenAddress), numToString(20))
      assert.strictEqual(await XPAAssets.unPaidFundAccount(lib.TWXTokenAddress), numToString(27.5))
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.USXTokenAddress), '0')
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.USXTokenAddress), '0')
      assert.strictEqual(await XPAAssets.toAmountBooks(lib.accounts[0], lib.TWXTokenAddress), numToString(272.5))
      assert.strictEqual(await XPAAssets.getLoanAmount(lib.accounts[0], lib.TWXTokenAddress), numToString(272.5))
    })
    it('執行者收取1%執行費', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.accounts[1]), numToString(500))
    })
    it('平倉基金增加47500 + 1000(強平額外手續費2%) = 48500', async () => {
      assert.strictEqual(await StandardToken.balanceOf(lib.FundAccountAddress), numToString(48500))
      assert.strictEqual(await XPAAssets.profit(), numToString(1000))
      assert.strictEqual(await XPAAssets.getRemainingAmount(lib.accounts[0], lib.USXTokenAddress), '0')
    })
  })
})



