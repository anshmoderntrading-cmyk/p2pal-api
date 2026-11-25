import { formatUnits } from 'ethers';
import { TronWeb } from 'tronweb';
import { ENV } from '../config/env';

const tronHeaders = ENV.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': ENV.TRONGRID_API_KEY } : {};
const lc = (s) => (s || '').toLowerCase();

async function evmHistory(chain, address) {
  if (!ENV.ETHERSCAN_API_KEY) throw new Error('EXPO_PUBLIC_ETHERSCAN_API_KEY set nahi hai');
  const base = `https://api.etherscan.io/v2/api?chainid=${chain.chainId}&module=account&address=${address}&sort=desc&page=1&offset=25&apikey=${ENV.ETHERSCAN_API_KEY}`;
  const [n, t] = await Promise.all([
    fetch(`${base}&action=txlist`).then((r) => r.json()),
    fetch(`${base}&action=tokentx`).then((r) => r.json()),
  ]);
  const me = lc(address);
  const native = (Array.isArray(n.result) ? n.result : [])
    .filter((x) => x.value !== '0')
    .map((x) => ({
      hash: x.hash,
      symbol: chain.symbol,
      amount: formatUnits(x.value, 18),
      dir: lc(x.from) === me ? 'out' : 'in',
      other: lc(x.from) === me ? x.to : x.from,
      time: Number(x.timeStamp) * 1000,
      failed: x.isError === '1',
    }));
  const tokens = (Array.isArray(t.result) ? t.result : []).map((x) => ({
    hash: x.hash,
    symbol: x.tokenSymbol,
    amount: formatUnits(x.value, Number(x.tokenDecimal)),
    dir: lc(x.from) === me ? 'out' : 'in',
    other: lc(x.from) === me ? x.to : x.from,
    time: Number(x.timeStamp) * 1000,
  }));
  return [...native, ...tokens].sort((a, b) => b.time - a.time);
}

async function tronHistory(address) {
  const base = `https://api.trongrid.io/v1/accounts/${address}`;
  const [trx, trc20] = await Promise.all([
    fetch(`${base}/transactions?limit=25&only_confirmed=true`, { headers: tronHeaders }).then((r) => r.json()),
    fetch(`${base}/transactions/trc20?limit=25&only_confirmed=true`, { headers: tronHeaders }).then((r) => r.json()),
  ]);

  const native = (trx.data || [])
    .filter((x) => x.raw_data?.contract?.[0]?.type === 'TransferContract')
    .map((x) => {
      const v = x.raw_data.contract[0].parameter.value;
      const from = TronWeb.address.fromHex(v.owner_address);
      const to = TronWeb.address.fromHex(v.to_address);
      return {
        hash: x.txID,
        symbol: 'TRX',
        amount: formatUnits(BigInt(v.amount), 6),
        dir: from === address ? 'out' : 'in',
        other: from === address ? to : from,
        time: x.block_timestamp,
        failed: x.ret?.[0]?.contractRet !== 'SUCCESS',
      };
    });

  const tokens = (trc20.data || []).map((x) => ({
    hash: x.transaction_id,
    symbol: x.token_info?.symbol || 'TRC20',
    amount: formatUnits(BigInt(x.value), Number(x.token_info?.decimals ?? 6)),
    dir: x.from === address ? 'out' : 'in',
    other: x.from === address ? x.to : x.from,
    time: x.block_timestamp,
  }));

  return [...native, ...tokens].sort((a, b) => b.time - a.time);
}

export function getHistory(chain, address) {
  return chain.type === 'tron' ? tronHistory(address) : evmHistory(chain, address);
}
