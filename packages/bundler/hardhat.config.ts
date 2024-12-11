import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'

import fs from 'fs'

import { HardhatUserConfig } from 'hardhat/config'
import { NetworkUserConfig } from 'hardhat/src/types/config'

const mnemonicFileName = process.env.MNEMONIC_FILE
let mnemonic = 'test '.repeat(11) + 'junk'
if (mnemonicFileName != null && fs.existsSync(mnemonicFileName)) {
  mnemonic = fs.readFileSync(mnemonicFileName, 'ascii').trim()
}

const infuraUrl = (name: string): string => `https://${name}.infura.io/v3/${process.env.INFURA_ID}`

function getNetwork (url: string, opts?: object): NetworkUserConfig {
  return {
    url,
    accounts: {
      mnemonic
    },
    ...opts
  }
}

function getInfuraNetwork (name: string): NetworkUserConfig {
  return getNetwork(infuraUrl(name))
}

const config: HardhatUserConfig = {
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5'
  },
  networks: {
    u2u: getNetwork('https://rpc-mainnet.uniultra.xyz'),
    tu2u: getNetwork('https://rpc-nebulas-testnet.uniultra.xyz'),
    localhost: getNetwork('http://localhost:8545', { saveDeployments: false }),
    goerli: getInfuraNetwork('goerli')
  },
  solidity: {
    version: '0.8.28',
    settings: {
      evmVersion: 'london',
      optimizer: { enabled: true }
    }
  }
}

export default config
