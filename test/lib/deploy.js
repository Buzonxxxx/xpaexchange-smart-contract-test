const CompiledStandardToken = require('../../build/StandardToken/StandardToken.json')
const CompiledBaliv = require('../../build/Baliv/Baliv.json')
const CompiledTokenFactory = require('../../build/TokenFactory/Tokenfactory.json')
const CompiledFundAccount = require('../../build/FundAccount/FundAccount.json')
const CompiledXPAAssets = require('../../build/XPAAssets/XPAAssets.json')
const CompiledXPAAssetToken = require('../../build/TokenFactory/XPAAssetToken.json')

class Deployment {
    constructor(web3){
        this.web3 = web3
    }
    async deploy(){
        this.accounts = await this.web3.eth.getAccounts()
        this.StandardToken = await this.deployContract(CompiledStandardToken, 0)
        this.Baliv = await this.deployContract(CompiledBaliv, this.StandardToken.options.address)
        this.TokenFactory = await this.deployContract(CompiledTokenFactory, this.StandardToken.options.address, this.Baliv.options.address)
        this.FundAccount = await this.deployContract(CompiledFundAccount, this.StandardToken.options.address, this.Baliv.options.address, this.TokenFactory.options.address)
        this.XPAAssets = await this.deployContract(CompiledXPAAssets, 0, this.StandardToken.options.address, this.TokenFactory.options.address, 0)
        this.newXPAAssets = await this.deployContract(CompiledXPAAssets, 0, this.StandardToken.options.address, this.TokenFactory.options.address, this.XPAAssets.options.address)
        
        this.StandardTokenAddress = this.StandardToken.options.address
        this.BalivAddress = this.Baliv.options.address
        this.TokenFactoryAddress = this.TokenFactory.options.address
        this.FundAccountAddress = this.FundAccount.options.address
        this.XPAAssetsAddress =  this.XPAAssets.options.address
        this.newXPAAssetsAddress = this.newXPAAssets.options.address
        
        await this.setContractInteraction()
        this.USXTokenAddress = await this.createToken(this.tokenSymbol = 'USX', this.tokenName = 'USXToken', this.defaultExchangeRate = 0.01, this.index = 0)
        this.TWXTokenAddress = await this.createToken(this.tokenSymbol = 'TWX', this.tokenName = 'TWXToken', this.defaultExchangeRate = 0.01, this.index = 1)
        
        // declare XPAAssetToken
        this.USXTokenContract = await new this.web3.eth.Contract(JSON.parse(CompiledXPAAssetToken.interface), this.USXTokenAddress)
        this.TWXTokenContract = await new this.web3.eth.Contract(JSON.parse(CompiledXPAAssetToken.interface), this.TWXTokenAddress) 
        this.USXTokenContractAddress = this.USXTokenContract.options.address
        this.TWXTokenContractAddress = this.TWXTokenContract.options.address
        
        return { 
                accounts : this.accounts, 

                StandardToken: this.StandardToken,
                Baliv: this.Baliv,
                TokenFactory: this.TokenFactory,
                FundAccount: this.FundAccount,
                XPAAssets: this.XPAAssets,
                USXTokenContract: this.USXTokenContract,
                TWXTokenContract: this.TWXTokenContract,
                newXPAAssets: this.newXPAAssets,

                StandardTokenAddress: this.StandardTokenAddress,
                BalivAddress: this.BalivAddress,
                TokenFactoryAddress: this.TokenFactoryAddress,
                FundAccountAddress: this.FundAccountAddress,
                XPAAssetsAddress: this.XPAAssetsAddress,
                newXPAAssetsAddress: this.newXPAAssetsAddress,
                USXTokenContractAddress: this.USXTokenContractAddress,
                TWXTokenContractAddress: this.TWXTokenContractAddress,
                USXTokenAddress: this.USXTokenAddress,
                TWXTokenAddress: this.TWXTokenAddress
            }
    }
    deployContract(compiledContracts, ...args){
        return new this.web3.eth.Contract(JSON.parse(compiledContracts.interface))
        .deploy({ data: compiledContracts.bytecode, arguments: args })
        .send({ from: this.accounts[0], gas: '4700000' })
    }
    async setContractInteraction() {
           this.TokenFactory.methods.setXPAAssets(this.XPAAssetsAddress)
           .send({ from: this.accounts[0] })
           this.TokenFactory.methods.addFundAccount(this.FundAccountAddress)
           .send({ from: this.accounts[0] })
           this.XPAAssets.methods.setFundAccount(this.FundAccountAddress)
           .send({ from: this.accounts[0] })  
           this.FundAccount.methods.assignOperator(this.XPAAssetsAddress)
           .send({ from: this.accounts[0] })  
    }

    async createToken(tokenSymbol, tokenName, defaultExchangeRate, index) {
        await this.XPAAssets.methods.createToken(tokenSymbol, tokenName, defaultExchangeRate)
        .send({ from: this.accounts[0], gas: '4700000' })
        return await this.XPAAssets.methods.xpaAsset(index).call()          
    }
 }

 module.exports = Deployment
