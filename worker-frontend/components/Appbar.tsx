"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/utils';

export const Appbar = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [balance, setBalance] = useState(0);
  const signedForRef = useRef<string | null>(null);

  async function signAndSend() {
    if (!isConnected || !address) return;
    if (signedForRef.current === address) return;

    const message = "Sign into Verge for voting on tasks";
    const signature = await signMessageAsync({ message });

    const response = await axios.post(`${BACKEND_URL}/v1/worker/signin`, {
      publicKey: address,
      signature,
    });

    setBalance(response.data.amount);
    console.log(response.data.token)
    localStorage.setItem("worker_token", response.data.token);
    signedForRef.current = address;
  }

  useEffect(() => {
    signAndSend().catch(() => {});
  }, [address, isConnected]);

  async function payout() {
    await axios.post(
      `${BACKEND_URL}/v1/worker/payout`,
      {},
      { headers: { 
        Authorization: localStorage.getItem("token")
      }
    }
    );
  }

  return (
    <div className="flex justify-between border-b pb-2 pt-2">
      <div className="text-2xl pl-4 flex justify-center pt-2">
        <img src="/verge.png" alt="Verge Logo" className="h-12 w-auto" />
      </div>
      <div className="text-xl pr-4 flex items-center gap-3">
        <button
          onClick={payout}
          className="m-2 mr-4 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5"
        >
          Pay me out ({balance}) XRP
        </button>
        <ConnectButton />
      </div>
    </div>
  );
};