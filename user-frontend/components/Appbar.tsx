'use client';
import { merge } from 'lodash';
import '@rainbow-me/rainbowkit/styles.css';
import { useEffect } from 'react';
import {
    getDefaultConfig,
    ConnectButton,
    RainbowKitProvider,
    darkTheme,
    lightTheme,
    Theme, 
} from '@rainbow-me/rainbowkit';
import { useWalletClient, WagmiProvider, useConnections } from 'wagmi';
import { BACKEND_URL } from '@/utils';
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
import axios from 'axios';

const config = getDefaultConfig({
    appName: 'Verge',
    projectId: 'dd1ed69c86e875fbde469749a73030fd',
    chains: [mainnet, polygon, optimism, arbitrum, base, xrplevmTestnet],
    ssr: false,
});

const myTheme = merge(darkTheme(), {
    colors: {
        accentColor: 'black',
    },
    fonts: {
        body: 'Futura',
    }
} as Theme);

const queryClient = new QueryClient();

export const Appbar = () => {
//    const { data : walletClient } = useWalletClient();

//     async function handleConnect() {
//         const response = await axios.post(`${BACKEND_URL}/v1/user/sign-in`, {
//             publicKey: walletClient?.account.address,
//         });

//         localStorage.setItem("token", response.data.token);
//     }

//     useEffect(() => {
//         handleConnect();
//     }, [walletClient]);

    return (
        <div className="flex justify-between border-b pb-2 pt-2 bg-white">
            <div className="text-2xl pl-4 flex justify-center">
                <img src="/verge.png" alt="Verge" className="h-16 w-auto" />
            </div>

        <div className="flex items-center gap-4">
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={myTheme}>
                    <div 
                    className="text-l pt-2 pr-4">
                        <ConnectButton/>
                    </div>
                </RainbowKitProvider>
            </QueryClientProvider>
    </WagmiProvider>
    </div>
    </div>
  );
}