import Chains from '@/lib/chains/client/apis'

export type Dictionary = { [key:string]:any }

export function getChainName(currency:string){
  const chains:Dictionary = {
    'strk': 'Starknet'
  }
  const name = chains[currency] || 'None'
  return name
}

export function getChainWallet(currency:string){
  const wallets:Dictionary = {
    'strk':  'Argent'
  }
  const name = wallets[currency] || 'None'
  return name
}

export function getChainNetwork(chain:string){
  const networks:Dictionary = {
    'strk':  process.env.NEXT_PUBLIC_STARKNET_NETWORK || ''
  }
  const name = networks[chain] || 'testnet'
  return name
}

const wallets: Dictionary = {
  argent:    { value: 'Argent',    image: '/wallets/argent.png',    chainEnabled: true },
  metamask:  { value: 'Metamask',  image: '/wallets/metamask.png',  chainEnabled: false }
}

const chainWallets: Dictionary = {
  strk:  [wallets['argent'], wallets['metamask']]
}

export function getChainWallets(chain: string) {
  return chainWallets[chain.toLowerCase()] ?? [wallets['argent']]
}

export function getChainsList(){
  const chains = Object.values(Chains).map((chain) => {
    return {
      value:   chain?.chain,
      coinSymbol:  chain?.coinSymbol  || '???',
      image:   '/coins/' + (chain?.logo || 'none.png'),
      chainEnabled: chain?.chainEnabled || false
    }
  })
  return chains
}

export function getChainsMap(){
  let chains:Dictionary = {}
  Object.values(Chains).map((chain) => {
    chains[chain.chain] = {
      coinSymbol:  chain?.coinSymbol  || '???',
      image:   '/coins/' + (chain?.logo || 'none.png'),
      chainEnabled: chain?.chainEnabled || false
    }
  })
  return chains
}

export function getCoinsList(chain:string){
  const coins:Dictionary = {
    'Starknet':[
      {
        value:  'STRK',
        image:   '/coins/strk.png',
        contract: '0x',
        native: true,
        chainEnabled: true
      },
      {
        value:  'USDC',
        image:   '/coins/usdc.png',
        contract: '0x',
        native: false,
        chainEnabled: true
      }
    ]
  }
  return coins[chain] || []
}
