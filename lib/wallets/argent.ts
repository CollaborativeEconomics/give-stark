import { WalletProvider } from '@/types/wallet'
import erc20abi from '@/lib/chains/contracts/erc20-abi.json'
import { connect, disconnect } from 'get-starknet'
import { RpcProvider, Provider, Contract, Account, constants, ec, json } from 'starknet'


export const MainnetProvider = {
  id         : 0,
  name       : 'mainnet',
  coinSymbol : 'STRK',
  decimals   : 18,
  gasprice   : '0',
  explorer   : 'https://starkscan.co',
  rpcurl     : 'https://starknet-mainnet.g.alchemy.com/v2/Z7y0BXn_ywvs8E87Gy8KpGHvkeDcvG79',
  wssurl     : ''
}

export const TestnetProvider = {
  id         : 0,
  name       : 'testnet',
  coinSymbol : 'STRK',
  decimals   : 18,
  gasprice   : '0',
  explorer   : 'https://sepolia.starkscan.co',
  rpcurl     : 'https://starknet-sepolia.g.alchemy.com/v2/A43FAEKotbRYvYd159JYGpaTtd5ss9eJ',
  wssurl     : ''
}

export default class Wallet {
  neturl    = 'https://starknet-sepolia.g.alchemy.com/v2/A43FAEKotbRYvYd159JYGpaTtd5ss9eJ'
  explorer  = 'https://sepolia.starkscan.co'
  network   = 'testnet'
  chainId   = '0x0'
  myaccount = ''
  accounts?:[any]
  provider?:WalletProvider
  server?:any

  constructor(provider:WalletProvider){
    this.provider = provider
  }

  toHex(num:number){
    return '0x'+num.toString(16)
  }

  shortAddress(adr:string){
    return this.myaccount.substr(0,10)+'...'
  }

  async login(){
    console.log('Login...')
  }

  isConnected(window:any){
    console.log('Wallet connected?')
  }

  async getAccounts() {
    console.log('Get accounts...')
  }

  async getAddress(oncall:any) {
    console.log('Get address...')
  }

  async getBalance(adr:string) {
    console.log('Get balance...')
  }

  async getGasPrice() {
    console.log('Get gas price...')
  }

  async getTransactionInfo(txid:string) {
    console.log('Transaction Info...')
  }

  async callContract(provider:any, abi:any, address:string, method:string, value:string) {
    console.log('Call', address, method)
  }

  async payment(destin:string, amount:string){
    console.log(`Sending ${amount} to ${destin}...`)
  }

  async paytoken(destin:string, amount:string, token:string, contract:string, memo:string){
    console.log(`Sending ${amount} ${token} token to ${destin}...`)
  }
}


// END