import {invert} from 'lodash'

const coinSymbolChainMap: Record<string, string> = {
  Starknet: 'strk'
} as const

type ChainName = typeof coinSymbolChainMap[keyof typeof coinSymbolChainMap];
type CoinSymbol = keyof typeof coinSymbolChainMap;

function coinFromChain(chain: ChainName): CoinSymbol {
  return coinSymbolChainMap[chain];
}

function chainFromCoin(coin: CoinSymbol): ChainName {
  return invert(coinSymbolChainMap)[coin];
}

export { coinFromChain, chainFromCoin }
