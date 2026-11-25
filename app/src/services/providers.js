import { JsonRpcProvider } from 'ethers';
import { TronWeb } from 'tronweb';
import { CHAINS } from '../config/chains';
import { ENV } from '../config/env';

const cache = {};

export function evmProvider(chain) {
  if (!cache[chain.key]) {
    cache[chain.key] = new JsonRpcProvider(chain.rpc, chain.chainId, { staticNetwork: true });
  }
  return cache[chain.key];
}

// privateKey sirf signing ke time pass karo; reads ke liye address set karo
export function tronWeb({ privateKey, address } = {}) {
  const tw = new TronWeb({
    fullHost: CHAINS.tron.fullHost,
    headers: ENV.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': ENV.TRONGRID_API_KEY } : {},
    ...(privateKey ? { privateKey } : {}),
  });
  if (!privateKey && address) tw.setAddress(address);
  return tw;
}
