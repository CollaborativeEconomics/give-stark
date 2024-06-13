import uploadToIPFS from '@/lib/utils/uploadToIPFS'
import { getOrganizationById, getInitiativeById, getUserByWallet, createNFT } from '@/lib/utils/registry'
import { constants, Account, Contract, Provider, RpcProvider } from 'starknet'
import { feltToStr, feltToHex } from '@/lib/utils/felt'
import { randomNumber } from '@/lib/utils/random'
import { getTransactionInfo } from '@/lib/chains/txinfo'
import abi721 from '@/contracts/NFT721.json'

interface transactionInfo {
  success?: boolean
  error?: string
  account?: string
  destination?: string
  destinationTag?: string
  amount?: string
}

// POST /api/nft/mint {paymentId}
// On donation:
//   Upload metadata to permanent storage
//   Mint nft with uri:metadata and get token Id
//   Send tokenId, offerId to client
export async function POST(request: Request) {
  console.log('API MINTING...')

  try {
    const body:any = await request.json()
    const {txid, initid, donor, destin, amount, rate} = body
    console.log('TXID', txid)
    console.log('INIT', initid)
    console.log('DONOR', donor)
    console.log('DESTIN', destin)
    console.log('AMOUNT', amount)
    console.log('RATE', rate)

    if(!txid){
      return Response.json({ error: 'Required txid is missing' }, {status:400})
    }

    // Get tx info
    const txInfo = await getTransactionInfo(txid)  // txInfo.result.sender_address
    //const txInfo = await getTransactionReceipt(txid)  // txInfo.result.execution_status: 'SUCCEEDED'
    console.log('TXINFO', txInfo)
    if(!txInfo){
      return Response.json({ error: 'Transaction not found' }, {status:404})
    }
    if('error' in txInfo) {
      console.log('ERROR', txInfo.error)
      return Response.json({ error: txInfo.error }, {status:500})
    }
    if(donor!==txInfo?.result?.sender_address){
      return Response.json({ error: 'Transaction not valid, wrong sender' }, {status:500})
    }

    // Form data
    const created = new Date().toJSON().replace('T', ' ').substring(0, 19)
    const donorAddress = txInfo?.result?.sender_address || ''
    const user = await getUserByWallet(donorAddress)
    const userId = user?.id || ''
  
    //return Response.json({ success: true, image: 'uriImage', metadata: 'uriMeta', tokenId: '123456', offerId: '123457'})

    // Get initiative info
    const initiative = await getInitiativeById(initid)
    //console.log('INITIATIVE', initiative)
    if(!initiative || initiative?.error) {
      console.log('ERROR', 'Initiative not found')
      return Response.json({ error: 'Initiative info not found' }, {status:500})
    }
    const initiativeId = initiative?.id || ''
    const initiativeName = initiative?.title || 'Direct Donation'

    // Get organization info
    const organization = await getOrganizationById(initiative?.organizationId)
    //console.log('ORGANIZATION', organization)
    if(!organization || organization?.error) {
      console.log('ERROR', 'Organization not found')
      return Response.json({ error: 'Organization info not found' }, {status:500})
    }
    const organizationId = organization?.id
    console.log(organizationId);
    const organizationName = organization?.name

    const network   = process.env.NEXT_PUBLIC_STARKNET_NETWORK || ''
    const chainName = 'Starknet'
    const currency  = 'STRK'
    const amountNum = parseFloat(amount) ||  0.0
    const amountCUR = amountNum.toFixed(4)
    const amountUSD = (amountNum * rate).toFixed(4)
    const uriImage  = initiative?.imageUri || 'ipfs:QmZWgvsGUGykGyDqjL6zjbKjtqNntYZqNzQrFa6UnyZF1n'

    // Save metadata
    const metadata = {
      mintedBy: 'CFCE via GiveStark',
      created: created,
      donorAddress: donorAddress,
      organization: organizationName,
      initiative: initiativeName,
      image: uriImage,
      blockchain: chainName,
      network,
      currency,
      amount: amountCUR,
      usdValue: amountUSD
    }
    console.log('META', metadata)
    const fileId = 'meta-' + txid // unique file id
    const bytes = Buffer.from(JSON.stringify(metadata, null, 2))
    const cidMeta = await uploadToIPFS(fileId, bytes, 'text/plain')
    console.log('CID', cidMeta)
    if (!cidMeta || cidMeta.error) {
      return Response.json({ error: 'Error uploading metadata' }, {status:500})
    }
    const cid = cidMeta?.result
    const uriMeta = 'ipfs:' + cid
    //let uriMeta = process.env.IPFS_GATEWAY_URL + cidMeta
    console.log('URI', uriMeta)

    // MINT !!!
    const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URI || '' })
    const address  = process.env.STARKNET_MINTER_ADDRESS || ''
    const privkey  = process.env.STARKNET_MINTER_PRIVATE || ''
    const account  = new Account(provider, address, privkey)
    const tokenNum = randomNumber(10)
    const ctr721   = '0x045d8da8227be85fec28cd4ba98b33bb1fba0408e1d78947a2d628c34e06ed4c'
    const contract = new Contract(abi721, ctr721, provider);
    contract.connect(account)
    const minted = await contract.safe_mint(address, tokenNum, [])
    console.log('MINTED', minted)

    if (!minted || minted?.error) {
      return Response.json({ error: 'Error minting NFT' }, {status:500})
    }
    const tokenId = ctr721 + ' #' + tokenNum

    // Save NFT data to Prisma
    const data = {
      created: new Date(),
      userId: userId,
      donorAddress: donorAddress,
      organizationId: organizationId,
      initiativeId: initiativeId,
      metadataUri: uriMeta,
      imageUri: uriImage,
      coinLabel: chainName,
      coinNetwork: network,
      coinSymbol: currency,
      coinValue: amountCUR,
      usdValue: amountUSD,
      tokenId: tokenId,
      status: 0
    }
    console.log('NftData', data)
    const saved = await createNFT(data)
    console.log('Saved', saved?.success)
    if (saved.success) {
      console.log('NFT saved in DB!')
    } else {
      console.error('Error saving NFT in DB!')
    }

    // Success
    console.log('Minting completed')
    console.log('RESULT', {
      success: true,
      image: uriImage,
      metadata: uriMeta,
      tokenId: tokenId
    })
    return Response.json({
      success: true,
      image: uriImage,
      metadata: uriMeta,
      tokenId: tokenId
    })

  } catch (ex:any) {
    console.error(ex)
    return Response.json({ success: false, error: ex.message }, {status:500})
  }
}
