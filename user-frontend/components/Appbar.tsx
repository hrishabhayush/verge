"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect } from 'react';
import axios from 'axios';
// import { BACKEND_URL } from '@/utils';

const BACKEND_URL = "http://localhost:3000";

export const Appbar = () => {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    async function signAndSend() {
        if (!address || !isConnected) {
            return;
        }
        
        try {
            const message = "Sign into Verge for voting";
            const signature = await signMessageAsync({ message });
            
            console.log(signature);
            console.log(address);
            console.log("[APPBAR] BACKEND_URL:", BACKEND_URL);
            const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
                publicKey: address,
                signature
            });

            localStorage.setItem("token", response.data.token);
        } catch (error) {
            console.error("Error signing message:", error);
        }
    }

    useEffect(() => {
        signAndSend();
    }, [address, isConnected]);

    return (
        <div className="flex justify-between border-b pb-2 pt-2">
            <div className="text-2xl pl-4 flex justify-center">
                <img src="/verge.png" alt="Verge Logo" className="h-12 w-auto" />
            </div>
            <div className="text-xl pr-4 pb-2">
                <ConnectButton />
            </div>
        </div>
    );
};