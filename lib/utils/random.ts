import { getRandomValues } from 'crypto';

function randomAddress() {
  let buf = getRandomValues(new Uint8Array(20));
  let adr =
    '0x' +
    Array.from(buf)
      .map((x) => {
        return x.toString(16).padStart(2, '0');
      })
      .join('');
  return adr;
}

function randomString(len = 10) {
  let ret = '';
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < len; ++i) {
    ret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ret;
}

function randomNumber(len = 8) {
  let ret = '';
  const chars = '0123456789';
  for (let i = 0; i < len; ++i) {
    ret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ret;
}

// 4665b011-55d6-48ff-8128-bd1a86ecf0dd
function UUID() {
  let buf = crypto.getRandomValues(new Uint8Array(16));
  let hex = Array.from(buf)
    .map((x) => {
      return x.toString(16).padStart(2, '0');
    })
    .join('');
  let ret = `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(
    12,
    4
  )}-${hex.substr(16, 4)}-${hex.substr(20)}`;
  return ret;
}

const DummyPayment = {
  organization: {},
  initiative: {},
  chainName: 'DummyChain',
  chainInfo: 'DummyChainInfo',
  wallet: 'dummyWalletAddress',
  sender: 'dummySenderAddress',
  receiver: 'dummyReceiverAddress',
  currency: 'STRK',
  amount: '0',
  name: 'Dummy Name',
  email: 'dummy@example.com',
  receipt: false,
  account: {},
  wei: 0,
  contractId: 'dummyContractId',
  coinValue: 0,
  usdValue: 0,
  connector: ""
};

export { randomAddress, randomString, randomNumber, UUID, DummyPayment };
