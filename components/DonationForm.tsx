import { useState, useRef, useContext, useEffect } from 'react';
import { set, z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputWithContent } from '@/components/ui/input-with-content';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckboxWithText } from '@/components/ui/checkbox';
import { DonationFormSelect } from '@/components/DonationFormSelect';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Dictionary,
  getChainWallets,
  getChainsList,
  getChainsMap,
  getCoinsList,
} from '@/lib/chains/utils';
import { DonationContext } from '@/components/DonationView';
import sendReceipt from '@/lib/utils/receipt';
import { DummyPayment } from '@/lib/utils/random';
import {
  postApi,
  getUserByWallet,
  anonymousUser,
  newUser,
} from '@/lib/utils/api';
//import getRates from '@/lib/utils/rates'
import NotFound from '@/components/NotFound';
import { Wallet } from '@/types/models';
import { ERC20 } from '@/contracts/ERC20.js';

import { connect, Connector } from 'starknetkit';
import {
  Provider,
  Contract,
  Call,
  constants,
  wallet,
  WalletAccount,
} from 'starknet';
import {
  executeCalls,
  fetchAccountCompatibility,
  fetchAccountsRewards,
  fetchGasTokenPrices,
  GaslessCompatibility,
  GaslessOptions,
  GasTokenPrice,
  PaymasterReward,
  SEPOLIA_BASE_URL,
  ExecuteCallsOptions,
  fetchGaslessStatus,
  DeploymentData,
} from '@avnu/gasless-sdk';

interface IForm {
  amount: string;
  email: string;
  receipt: boolean;
}

interface IDonation {
  organization?: Dictionary;
  initiative?: Dictionary;
  sender: string;
  chainName: string;
  network: string;
  coinValue: number;
  usdValue: number;
  currency: string;
  user: Dictionary;
}

interface IDonationOperation {
  organization?: Dictionary;
  initiative?: Dictionary;
  sender: string;
  chainName: string;
  coinValue: number;
  usdValue: number;
  receiver: string;
  name: string;
  email: string;
  receipt: boolean;
  contractId: string;
  currency: string;
}

interface IPayment {
  organization?: Dictionary;
  initiative?: Dictionary;
  chainName: string;
  chainInfo: string;
  wallet: string;
  sender: string;
  receiver: string;
  currency: string;
  amount: string;
  name: string;
  email: string;
  receipt: boolean;
  account: any;
  wei: number;
  contractId: string;
  coinValue: number;
  usdValue: number;
  connector: any;
}

export default function DonationForm(props: any) {
  console.log('Props', props);
  const initiative = props.initiative;
  const usdRate = parseFloat(props?.rate || 0) || 0.0;
  const organization = initiative?.organization;
  if (!initiative || !organization) {
    return <NotFound />;
  }
  const { donation, setDonation } = useContext(DonationContext);
  const chainName = 'Starknet';
  const currency = 'STRK';
  const chains = getChainsList();
  const chainLookup = getChainsMap();
  const chainWallets = getChainWallets(chains[0].coinSymbol);
  const chainInfo = chainLookup[chains[0].value];
  const chainCoins = getCoinsList(chainName);
  const [currentChain, setCurrentChain] = useState(chainName);
  const [wallets, setWallets] = useState(chainWallets);
  const [currentWallet, setCurrentWallet] = useState(wallets[0]);
  const [coins, setCoins] = useState(chainCoins);
  const [currentCoin, setCurrentCoin] = useState(chainCoins[0]);
  const [txid, setTxid] = useState('');
  //const amountInputRef = useRef()
  const amountRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const [disabled, setDisabled] = useState(false);
  const [buttonText, setButtonText] = useState('Donate');
  const [message, setMessage] = useState('One wallet confirmation required');
  const [rate, setRate] = useState(usdRate);
  const [rateMessage, setRateMessage] = useState('USD conversion rate');
  const rateCache: Dictionary = { STRK: usdRate, USDC: 1, USDT: 1 };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [donationState, setDonationState] = useState<IPayment>(DummyPayment);


  console.log('Chains', chains);
  console.log('CurrChain', currentChain);
  console.log('Wallets', wallets);
  console.log('CurrWallet', currentWallet);
  console.log('Coins', coins);
  console.log('CurrCoin', currentCoin);
  console.log('Cache', rateCache);

  function validEmail(text: string) {
    //return text.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g)
    const emailSchema = z.string().email();
    return emailSchema.safeParse(text).success;
  }

  function getWalletByChain(wallets: Wallet[], chain: string) {
    for (let i = 0; i < wallets.length; i++) {
      if (wallets[i].chain.toString() == chain) {
        return wallets[i];
      }
    }
    return null;
  }

  async function validForm({ amount, email, receipt }: IForm) {
    if (!parseInt(amount)) {
      setMessage('Enter a valid amount');
      return false;
    }
    if (receipt && !validEmail(email)) {
      setMessage('Enter a valid email');
      return false;
    }
  }

  async function getRate(coin: string) {
    console.log('COIN', coin);
    if (rateCache[coin]) {
      return rateCache[coin];
    }
    const resp = await fetch('/api/rates?coin=' + coin);
    const rate = await resp.json();
    console.log('RATE', rate);
    rateCache[coin] = rate;
    return rate;
  }

  async function saveDonation({
    organization,
    initiative,
    sender,
    chainName,
    network,
    coinValue,
    usdValue,
    currency,
    user,
  }: IDonation) {
    const catId = initiative?.categoryId || organization?.categoryId;
    const donation = {
      organizationId: organization?.id,
      initiativeId: initiative?.id,
      categoryId: catId,
      userId: user?.id,
      paytype: 'crypto',
      chain: chainName,
      network: network,
      wallet: sender,
      amount: coinValue,
      usdvalue: usdValue,
      asset: currency,
      status: 1,
    };
    console.log('DONATION', donation);
    const donationResp = await postApi('donations', donation);
    console.log('SAVED DONATION', donationResp);
    if (!donationResp.success) {
      setButtonText('ERROR');
      setDisabled(true);
      setMessage('Error saving donation');
      return false;
    }
    const donationId = donationResp.data?.id;
    return donationId;
  }

  async function sendPayment({
    organization,
    initiative,
    chainName,
    chainInfo,
    wallet,
    sender,
    receiver,
    currency,
    amount,
    name,
    email,
    receipt,
    account,
    coinValue,
    usdValue,
    wei,
    contractId,
  }: IPayment) {
    console.log('--->PAY:', {
      organization,
      initiative,
      chainName,
      chainInfo,
      wallet,
      receiver,
      currency,
      amount,
      name,
      email,
      receipt,
    });
    setButtonText('WAIT');
    setDisabled(true);
    setMessage('Sending payment, wait a moment...');
    setMessage('Approve payment in your wallet');

    try {
      // Gasless Transaction
      const address: string = account.address;

      const weihex = '0x' + wei.toString(16);

      const options: GaslessOptions = {
        baseUrl: SEPOLIA_BASE_URL,
        apiPublicKey: process.env.NEXT_PUBLIC_AVNU_PUBLIC_KEY,
        apiKey: process.env.NEXT_PUBLIC_AVNU_KEY,
      };
      const gasTokenPrice = await fetchGasTokenPrices(options);
      console.log('GasTokenPrice', gasTokenPrice);

      // const estimatedGasFees = estimateCalls()
      console.log('GasTokenPrice', gasTokenPrice);

      const CallsOptions: ExecuteCallsOptions = {
        gasTokenAddress: gasTokenPrice[0].tokenAddress,
        maxGasTokenAmount: BigInt(gasTokenPrice[0].priceInETH * BigInt(2)),
      };

      console.log('Options', options);
      console.log('contractId', contractId);

      const calls: Call[] = [
        {
          entrypoint: 'transfer',
          contractAddress: contractId,
          calldata: [receiver, weihex, '0x0'],
        },
      ];
      const txid = (
        await executeCalls(
          account,
          calls,
          {
            gasTokenAddress: undefined,
            maxGasTokenAmount: undefined,
          },
          options
        )
      ).transactionHash;
      setTxid(txid);
      donationOperation({
        organization,
        initiative,
        chainName,
        sender,
        receiver,
        currency,
        name,
        email,
        receipt,
        coinValue,
        usdValue,
        contractId,
      });
      setButtonText('DONE');
      setDisabled(true);
      setMessage('Thank you for your donation!');
    } catch (error) {
      setButtonText('ERROR');
      setMessage('Error sending transaction');
      return;
    }
  }

  const getDeploymentData = async (connector: Connector) => {
    if (!connector) return undefined;
    console.log(connector);
    // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    const walletData = await connector['_wallet'].request({
      type: 'wallet_deploymentData',
    });
    return walletData;
  };

  async function underDeployedAccount({
    organization,
    initiative,
    chainName,
    sender,
    receiver,
    currency,
    name,
    email,
    receipt,
    account,
    coinValue,
    usdValue,
    wei,
    contractId,
    connector,
  }: IPayment) {
    const deploymentData: DeploymentData | undefined = await getDeploymentData(
      connector
    );
    console.log('Deployment Data', deploymentData);
    try {
      // Gasless Transaction

      const weihex = '0x' + wei.toString(16);

      const options: GaslessOptions = {
        baseUrl: SEPOLIA_BASE_URL,
        apiPublicKey: process.env.NEXT_PUBLIC_AVNU_PUBLIC_KEY,
        apiKey: process.env.NEXT_PUBLIC_AVNU_KEY,
      };
      const gasTokenPrice = await fetchGasTokenPrices(options);
      console.log('GasTokenPrice', gasTokenPrice);

      const calls: Call[] = [
        {
          entrypoint: 'transfer',
          contractAddress: contractId,
          calldata: [receiver, weihex, '0x0'],
        },
      ];
      const txid = (await executeCalls(account, calls, { deploymentData }, options))
        .transactionHash;
      setTxid(txid);
      donationOperation({
        organization,
        initiative,
        chainName,
        sender,
        receiver,
        currency,
        name,
        email,
        receipt,
        coinValue,
        usdValue,
        contractId,
      });
      setButtonText('DONE');
      setDisabled(true);
      setMessage('Thank you for your donation!');
    } catch (error) {
      setButtonText('ERROR');
      setMessage('Error sending transaction');
      return;
    }
  }

  async function gasTransaction({
    organization,
    initiative,
    chainName,
    sender,
    receiver,
    currency,
    name,
    email,
    receipt,
    account,
    coinValue,
    usdValue,
    wei,
    contractId,
  }: IPayment) {
    const contract = new Contract(ERC20, contractId, account);
    try {
      const transfer = await contract.transfer(receiver, {
        low: wei,
        high: 0,
      });
      const txid = transfer.transaction_hash;
      setTxid(txid);
      donationOperation({
        organization,
        initiative,
        chainName,
        sender,
        receiver,
        currency,
        name,
        email,
        receipt,
        coinValue,
        usdValue,
        contractId,
      });
      setButtonText('DONE');
      setDisabled(true);
      setMessage('Thank you for your donation!');
    } catch (error) {
      setButtonText('ERROR');
      setMessage('Error sending transaction');
      return;
    }
  }

  async function donationOperation({
    organization,
    initiative,
    chainName,
    sender,
    receiver,
    currency,
    name,
    email,
    receipt,
    coinValue,
    usdValue,
    contractId,
  }: IDonationOperation) {
    const userResp = await getUserByWallet(sender);
    let user = userResp?.result;
    if (!user) {
      const anon = anonymousUser(sender, chainName);
      user = await newUser(anon);
      console.log('Anon', user);
      if (!user) {
        console.log('Error creating anonymous user');
        setButtonText('ERROR');
        setMessage('Error saving user data, contact support');
        return false;
      }
    }

    // Save donation to db
    const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK || '';
    const saveResp = await saveDonation({
      organization,
      initiative,
      sender,
      chainName,
      network,
      coinValue,
      usdValue,
      currency,
      user,
    });
    if (!saveResp) {
      setButtonText('ERROR');
      setMessage(
        'Donation could not be saved to database, please contact support'
      );
      return false;
    }

    // Send receipt
    if (receipt) {
      console.log('RECEIPT');
      setMessage('Sending receipt, wait a moment...');
      const data = {
        name: name,
        email: email,
        org: organization?.name,
        address: organization?.mailingAddress,
        ein: organization?.EIN,
        currency: currency,
        amount: coinValue.toFixed(2),
        usd: usdValue.toFixed(2),
      };
      const receiptResp = await sendReceipt(data);
      console.log('Receipt sent', receiptResp);
    }

    const NFTData = {
      status: 'Claim',
      organization: {
        name: organization?.name,
        address: organization?.mailingAddress,
        ein: organization?.EIN,
      },
      initiativeId: initiative?.id,
      tag: initiative?.tag,
      image: initiative?.defaultAsset,
      date: new Date(),
      amount: coinValue,
      ticker: currency,
      amountFiat: usdValue,
      fiatCurrencyCode: 'USD',
      donor: {
        name: name || user?.name || 'Anonymous',
        address: sender,
      },
      receiver,
      contractId,
      chainName,
      rate,
      txid,
    };
    setDonation(NFTData);
  }

  async function donate() {
    const chainInfo = chainLookup[chainName];
    const chainText = chainName;
    const wallet = currentWallet.value;
    const amount =
      typeof amountRef == 'object' ? amountRef.current?.value || '0' : '0';
    const name = typeof nameRef == 'object' ? nameRef.current?.value || '' : '';
    const email =
      typeof emailRef == 'object' ? emailRef.current?.value || '' : '';
    const receipt =
      typeof receiptRef == 'object'
        ? receiptRef.current?.dataset['state'] == 'checked' || false
        : false;
    const currency =
      typeof currentCoin == 'string' ? currentCoin : currentCoin.value;
    let decs = 18;
    if (currency == 'USDC') {
      decs = 6;
    }

    const amountStr = parseFloat(amount || '0').toFixed(decs);
    const amountNum = parseFloat(amountStr);
    const coinValue = amountNum;
    const usdValue = amountNum * rate;
    const wei = amountNum * 10 ** decs;
    console.log('WEI', wei, amountNum, coinValue, usdValue);

    console.log('FORM --------');
    console.log('Chain:', chainName);
    console.log('Currency:', currency);
    console.log('Wallet:', wallet);
    console.log('Amount:', amount);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Receipt:', receipt);

    if (!validForm({ amount, email, receipt })) {
      return;
    }

    // Temporary organization object with wallet
    const temporaryOrganization = {
      id: '0x0123456789abcdef',
      name: 'Starknet',
      email: 'starknet@starknet.io',
      wallets: [
        {
          id: '0x0123456789abcdef',
          organizationId: '0x0123456789abcdef',
          initiativeId: '0x0123456789abcdef',
          chain: chains,
          address:
            '0x023345e38d729e39128c0cF163e6916a343C18649f07FcC063014E63558B20f3',
        },
      ],
    };

    const orgWallet =
      getWalletByChain(organization?.wallets || [], chainText) ||
      temporaryOrganization.wallets[0];
    console.log('Org wallet', orgWallet);
    if (!orgWallet || !orgWallet?.address) {
      console.log(
        'Error sending payment, no wallet found for chain',
        chainName
      );
      setMessage('Error: no wallet in this organization for ' + chainName);
      return false;
    }
    const receiver = orgWallet.address;

    const starknet = await connect({ modalMode: 'alwaysAsk' });
    const account = starknet?.wallet?.account;
    const connector = starknet.connector;

    if (!account) {
      setMessage('Could not connect to your wallet');
      return;
    }

    // @ts-ignore: Typescript sucks donkey balls
    const sender = account?.address;
    const chainId = constants.StarknetChainId.SN_SEPOLIA; // SN_MAIN
    if (starknet?.wallet?.id == 'argentX') {
      if (account?.provider.chainId !== chainId) {
        await starknet?.wallet?.request({
          type: 'wallet_switchStarknetChain',
          params: { chainId: constants.StarknetChainId.SN_SEPOLIA },
        });
      }
    }

    let contractId =
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'; // STRK
    if (currency == 'USDC') {
      contractId =
        '0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080'; // USDC
    }
    console.log('CONTRACT', contractId, account);

    const newState = {
      organization,
      initiative,
      chainName,
      chainInfo,
      wallet,
      receiver,
      currency,
      amount,
      name,
      email,
      receipt,
      account,
      wei,
      contractId,
      sender,
      coinValue,
      usdValue,
      connector,
    };
    setDonationState(newState);

    const options: GaslessOptions = {
      baseUrl: SEPOLIA_BASE_URL,
    };

    try {
      await fetchAccountCompatibility(sender, options);
      sendPayment(newState);
    } catch (error) {
      console.error('Error fetching account compatibility:', error);
      if (error instanceof Error && error.message === 'Account not deployed') {
        if (starknet?.wallet?.id == 'argentX') {
          await underDeployedAccount(newState);
        } else {
          setIsDialogOpen(true);
        }
      }
    }
  }

  function recalc(newRate: number, coin: string) {
    console.log('RECALC', rate, newRate, coin);
    const usdRate = newRate ?? rate;
    const amount =
      typeof amountRef == 'object' ? amountRef.current?.value || '0' : '0';
    const amountNum = parseFloat(amount);
    const coinValue = amountNum;
    const rateValue = amountNum * usdRate;
    const coinSymbol = coin;
    const rateMsg = `USD ${rateValue.toFixed(2)} at ${usdRate.toFixed(
      2
    )} ${coinSymbol}/USD`;
    console.log('AMT', coinValue, rateValue, coinSymbol);
    setRateMessage(rateMsg);
  }

  return (
    <div className="flex min-h-full w-full mt-4">
      <Card className="py-6 w-full shadow-xl">
        <div className="px-6">
          <Label htmlFor="chain-select" className="mb-2">
            Blockchain
          </Label>
          <DonationFormSelect
            id="chain-select"
            className="mb-6"
            options={chains}
            currentOption={currentChain ?? ''}
            handleChange={(chain: string) => {
              const coinSymbol =
                Object.keys(chainLookup).length > 0
                  ? chainLookup[chain].coinSymbol
                  : '';
              const listWallets = getChainWallets(coinSymbol);
              const listCoins = getCoinsList(chain);
              setCurrentChain(chain);
              setWallets(listWallets);
              setCoins(listCoins);
            }}
            placeHolderText="...select a cryptocurrency"
          />
          <Label htmlFor="wallet-select" className="mb-2">
            Wallet
          </Label>
          <DonationFormSelect
            id="wallet-select"
            className="mb-6"
            options={wallets}
            currentOption={currentWallet?.value ?? ''}
            handleChange={(wallet: { value: string; image: string }) =>
              setCurrentWallet(wallet)
            }
            placeHolderText="...select a cryptowallet"
          />
          <Label htmlFor="coin-select" className="mb-2">
            Coin or Token
          </Label>
          <DonationFormSelect
            id="coin-select"
            className="mb-6"
            options={coins}
            currentOption={currentCoin?.value ?? ''}
            handleChange={(coin: any) => {
              setCurrentCoin(coin);
              console.log('--->>>>> SEL', coin);
              getRate(coin).then((usd) => {
                console.log('GETRATE', usd);
                setRate(usd);
                recalc(usd, coin);
              });
            }}
            placeHolderText="...select a coin or token"
          />
        </div>
        <Separator />
        <div className="px-6">
          <div className="w-full my-6">
            <div className="flex flex-row justify-between items-center mb-2">
              <Label>Amount</Label>
            </div>
            <div className="my-auto">
              <InputWithContent
                className="pl-4"
                type="text"
                id="amount"
                text={'| ' + (currentCoin?.value ?? currentCoin)}
                ref={amountRef}
                divRef={amountRef}
                onChange={() => recalc(rate, currentCoin)}
              />
            </div>
            <Label className="block mt-2 text-right">{rateMessage}</Label>
          </div>
          <Label htmlFor="name-input" className="mb-2">
            Name (optional)
          </Label>
          <Input
            type="text"
            className="pl-4 mb-6"
            id="name-input"
            ref={nameRef}
          />
          <Label htmlFor="email-input" className="mb-2">
            Email address (optional)
          </Label>
          <Input
            type="text"
            className="pl-4 mb-6"
            id="email-input"
            ref={emailRef}
          />
          <CheckboxWithText
            id="receipt-check"
            text="I'd like to receive an emailed receipt"
            className="mb-2"
            ref={receiptRef}
          />
        </div>
        <Separator />
        <div className="flex flex-col items-center justify-center">
          <Button
            disabled={disabled}
            className="mt-6 mx-6 w-[250px] h-[50px] bg-blue-600 text-white text-lg outline outline-slate-300 outline-1 hover:bg-blue-700 hover:shadow-inner"
            onClick={donate}
          >
            {buttonText}
          </Button>
          <p className="mt-2 text-sm">{message}</p>
        </div>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Wallet Compatibility Issue
            </DialogTitle>
            <DialogDescription className="text-white-600">
              Your wallet is not compatible. Would you like to continue the
              transaction by paying gas or learn how to upgrade your wallet?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <DialogClose>
              <Button
                onClick={() => {
                  gasTransaction(donationState);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Continue with Gas Payment
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                window.open(
                  'https://support.argent.xyz/hc/en-us/articles/8802319054237-How-to-activate-deploy-my-Argent-X-wallet',
                  '_blank'
                );
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Learn How to Upgrade
            </Button>
            <DialogClose className="text-white-500 hover:underline">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
