"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useRef } from 'react';
import axios from 'axios';
// import { BACKEND_URL } from '@/utils';

const BACKEND_URL = "http://localhost:3000";

export const Appbar = () => {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const isSigningRef = useRef(false);
    const signedForRef = useRef<string | null>(null);
  
    async function signAndSend() {
        if (!address || !isConnected) {
            return;
        }

        if (isSigningRef.current) return;
        if (signedForRef.current === address) return;

        isSigningRef.current = true;
        
        try {
            const message = "Sign into Verge for uploading tasks";
            const signature = await signMessageAsync({ message });
    
            const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
                publicKey: address,
                signature
            });

            localStorage.setItem("token", response.data.token);
            signedForRef.current = address;
        } catch (error) {
            console.error("Error signing message:", error);
        } finally {
            isSigningRef.current = false;
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