import { Contract, formatUnits } from 'ethers';
import { evmProvider, tronWeb } from './providers';

export const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

async function evmBalance(chain, address, token) {
  const p = evmProvider(chain);
  const raw = token.address
    ? await new Contract(token.address, ERC20_ABI, p).balanceOf(address)
    : await p.getBalance(address);
  return formatUnits(raw, token.decimals);
}

async function tronBalance(address, token) {
  const tw = tronWeb({ address });
  if (!token.address) {
    const sun = await tw.trx.getBalance(address);
    return formatUnits(BigInt(sun), 6);
  }
  const c = await tw.contract().at(token.address);
  const raw = await c.balanceOf(address).call();
  return formatUnits(BigInt(raw.toString()), token.decimals);
}

// Har token ka balance; ek fail ho to baaki dikhte rahe
export async function getBalances(chain, address, tokens) {
  return Promise.all(
    tokens.map(async (t) => {
      try {
        const balance = chain.type === 'tron' ? await tronBalance(address, t) : await evmBalance(chain, address, t);
        return { ...t, balance };
      } catch (e) {
        return { ...t, balance: '0', error: e.message };
      }
    })
  );
}
