const path = require('path')
const fs = require('fs-extra')
const solc = require('solc')


const contracts = ["StandardToken", "FundAccount", "Baliv", "TokenFactory", "XPAAssets"]

contracts.forEach(contract => {
  // delete entire build folder
  const buildPath = path.resolve(__dirname, 'build', contract)
  fs.removeSync(buildPath)

  // __dirname: root directory
  const ContractPath = path.resolve(__dirname, 'contracts', `${contract}.sol`)
  const source = fs.readFileSync(ContractPath, 'utf8')
  const output = solc.compile(source, 1).contracts

  // check and create build folder
  fs.ensureDirSync(buildPath)

  // ouput contract to json
  for (let contract in output) {
    fs.outputJsonSync(
      path.resolve(buildPath, `${contract.replace(':', '')}.json`),
      output[contract]
    )
  }
})
