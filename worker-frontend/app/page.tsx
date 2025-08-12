"use client";
import { Appbar } from "@/components/Appbar";
import { NextTask } from "@/components/NextTask";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, xrplevmTestnet } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

const config = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum, base, xrplevmTestnet],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [xrplevmTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: "black",
        })}>
          <main className="bg-white text-black min-h-screen">
            <Appbar />
            <NextTask />
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}