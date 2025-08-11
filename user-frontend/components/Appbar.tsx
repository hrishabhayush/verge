'use client';

import '@rainbow-me/rainbowkit/styles.css';

import {
    getDefaultConfig,
    ConnectButton,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';

import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    xrplevmTestnet,
} from 'wagmi/chains';

import {
    QueryClientProvider,
    QueryClient,
} from '@tanstack/react-query';

const config = getDefaultConfig({
    appName: 'Verge',
    projectId: 'dd1ed69c86e875fbde469749a73030fd',
    chains: [mainnet, polygon, optimism, arbitrum, base, xrplevmTestnet],
    ssr: false,
});

const queryClient = new QueryClient();

export const Appbar = () => {
    return (
        <div className="flex justify-between border-b pb-2 pt-2 bg-white">
            <div className="text-2xl pl-4 flex justify-center">
                <img src="/verge.png" alt="Verge" className="h-16 w-auto" />
            </div>

        <div className="flex items-center gap-4">
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <div className="text-l pt-2 pr-4">
                        <ConnectButton />
                    </div>
                </RainbowKitProvider>
            </QueryClientProvider>
    </WagmiProvider>
    </div>
    </div>
  );
}