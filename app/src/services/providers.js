import { JsonRpcProvider } from 'ethers';
import { TronWeb } from 'tronweb';
import { NETWORKS } from '../config/chains';
import { ENV } from '../config/env';

let bsc = null;
export function bscProvider() {
  if (!bsc) bsc = new JsonRpcProvider(NETWORKS.bsc.rpc, 56, { staticNetwork: true });
  return bsc;
}

export const tronHeaders = ENV.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': ENV.TRONGRID_API_KEY } : {};

export function tronWeb(privateKey) {
  return new TronWeb({
    fullHost: NETWORKS.tron.fullHost,
    headers: tronHeaders,
    ...(privateKey ? { privateKey } : {}),
  });
}
