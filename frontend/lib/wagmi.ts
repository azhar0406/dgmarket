import { http, createConfig } from 'wagmi';
import { baseSepolia, mainnet } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Create connectors array
const connectors = [
  injected(),
  metaMask(),
];

// Only add WalletConnect if we have a valid project ID
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (projectId && projectId !== 'temp_placeholder_id' && projectId !== '') {
  connectors.push(walletConnect({ projectId }));
}

export const config = createConfig({
  chains: [baseSepolia, mainnet],
  connectors,
  transports: {
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
  },
});