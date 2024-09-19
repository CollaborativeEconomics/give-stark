'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProviders, signIn } from 'next-auth/react';
import { ConfigContext } from '@/components/config';
import ButtonWallet from '@/components/ButtonWallet';
import { fetchApi, postApi } from '@/lib/utils/api';
import { connect, disconnect } from 'starknetkit';
import {
  RpcProvider,
  Provider,
  Contract,
  Account,
  constants,
  ec,
  json,
} from 'starknet';

export default function Signin() {
  const chainName = 'Starknet';
  const chainid = '0';
  const network = 'testnet';
  const currency = 'STRK';
  // @ts-ignore: Typescript sucks donkey balls
  const { config, setConfig } = useContext(ConfigContext);
  console.log('CONFIG INDEX', config);
  const router = useRouter();
  const [loginText, setLoginText] = useState(
    config?.user == '' ? 'LOGIN' : 'PROFILE ' + config.wallet.substr(0, 10)
  );
  const [logged, setLogged] = useState(config.user !== '');
  const [userId, setUserId] = useState(config.user);

  async function checkUser(address: string) {
    const res = await fetch('/api/users?wallet=' + address);
    const data = await res.json();
    const user = data.result;

    if (user) {
      // Redirect to profile
      console.log('UserId', user.id);
      setUserId(user.id);
      setConfig({ ...config, wallet: address, user: user.id });
      const callbackUrl = '/profile/' + user.id;
      await signIn(chainName, {
        callbackUrl,
        address,
        chainName,
        chainid,
        network,
        currency,
      });
      router.push('/profile/' + user.id);
    } else {
      const body = JSON.stringify({
        name: 'Anonymous',
        wallet: address,
        wallets: {
          create: {
            address: address,
            chain: chainName,
          },
        },
      });

      const rex = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const newUser = await rex.json();
      const userInfo = newUser.data;
      console.log('NEWUSER', userInfo);
      if (!userInfo) {
        console.log('Error creating user');
      } else {
        const callbackUrl = '/profile/' + userInfo.id;
        await signIn(chainName, {
          callbackUrl,
          address,
          chainName,
          chainid,
          network,
          currency,
        });
        router.push('/profile/' + userInfo.id);
      }
    }
  }

  async function onLogin() {
    console.log('--LOGIN');
    if (logged && userId) {
      router.push('/profile/' + userId);
      return;
    }
    const starknet = await connect();
    console.log('STRK', starknet);
    // @ts-ignore: Typescript sucks donkey balls
    if (!starknet?.wallet?.isConnected) {
      // @ts-ignore: Typescript sucks donkey balls
      const ready = await starknet?.wallet?.enable();
      console.log('READY', ready);
    }
    // @ts-ignore: Typescript sucks donkey balls
    const address = starknet?.wallet?.account?.address || '';
    console.log('ADDR', address);
    if (!address) {
      setLoginText('Could not connect to wallet, try again');
      return;
    }
    setLogged(true);
    setLoginText('WALLET ' + address?.substr(0, 10) + '...');
    checkUser(address);
  }

  return (
    <div className="w-[500px] mt-48 p-12 mx-auto rounded-xl border">
      <div className="mt-5">
        <div className="text-center flex flex-col justify-center items-center">
          <ButtonWallet
            text="Argent"
            icon="argent.png"
            href="https://argent.xyz"
            className="w-[200px]"
          />
          <li className="list-none my-4">
            <p className="text-xl mt-4">We use Argent wallet for Starknet</p>
            <p>
              <Link href={'https://argent.xyz'} target="_blank">
                Download Argent wallet
              </Link>
            </p>
          </li>
          <div className="mt-5 w-full">
            <button
              className="w-full py-3 rounded border bg-blue-600 hover:bg-blue-500 text-white"
              onClick={onLogin}
            >
              {loginText}
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-8">
            You will need to have STRK in a wallet that supports Starknet
            Blockchain, such as Argent. Argent is a secure, non-custodial,
            end-to-end encrypted, blockchain wallet. You can learn more in their
            website.
          </p>
        </div>
      </div>
    </div>
  );
}
