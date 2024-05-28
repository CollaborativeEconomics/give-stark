import {invert} from 'lodash'

const coinSymbolChainMap: Record<string, string> = {
  Starknet: 'strk',
  XDC: 'xdc'
} as const

type ChainName = typeof coinSymbolChainMap[keyof typeof coinSymbolChainMap];
type CoinSymbol = keyof typeof coinSymbolChainMap;

/**
 *
 * @param chain Chain name (e.g. 'Arbitrum')
 * @returns chain symbol (e.g. 'arb')
 */
function coinFromChain(chain: ChainName): CoinSymbol {
  return coinSymbolChainMap[chain];
}

/**
 *
 * @param coin Chain symbol (e.g. 'arb')
 * @returns Chain name (e.g. 'Arbitrum')
 */
function chainFromCoin(coin: CoinSymbol): ChainName {
  return invert(coinSymbolChainMap)[coin];
}

export { coinFromChain, chainFromCoin }
