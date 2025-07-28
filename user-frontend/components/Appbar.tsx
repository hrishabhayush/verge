"use client";
import { BACKEND_URL } from '@/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import axios from 'axios';


export const Appbar = () => {
    const { publicKey, signMessage } = useWallet();

    async function signAndSend() {
        if (!publicKey) {
            return;
        }
        
        const message = new TextEncoder().encode("Sign in to decentralized fiver website");
        const signature = await signMessage?.(message);
        const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
            signature,
            publicKey: publicKey?.toString()
        });

        // unique token for each new user
        localStorage.setItem("token", response.data.token);
    }

    useEffect(() => {
        signAndSend();
    }, [publicKey])

    return <div className="flex justify-between border-b pb-2 pt-2 bg-white">
        <div className="text-2xl pl-4 flex justify-center">
            <img src="/verge.png" alt="Verge Logo" className="h-16 w-auto" />
        </div>
        <div className="text-xl pr-4 pt-2">
            {publicKey ? <WalletDisconnectButton /> : <WalletMultiButton /> }
        </div>
    </div>
}