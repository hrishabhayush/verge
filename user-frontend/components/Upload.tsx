"use client";
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export const Upload = () => {
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [txSignature, setTxSignature] = useState("");
    const { publicKey, sendTransaction } = useWallet();
    const router = useRouter();
    const { connection } = useConnection();

    async function onSubmit() {
        const response = await axios.post(`${BACKEND_URL}/v1/user/task`, {
            options: images.map(image => ({
                imageUrl: image,
            })),
            title,
            signature: txSignature
        }, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        });

        router.push(`/task/${response.data.id}`);
    }

    async function makePayment() {
        if (!publicKey) {
            alert("Wallet is not connected. Please connect your wallet.");
            return;
        }


        // Using Devnet recepient address and small test amount
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(process.env.PUBLIC_KEY!),
                lamports: 10000
            })
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection, { minContextSlot });

        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
        setTxSignature(signature);
    }

    return <div className="flex justify-center bg-white">
        <div className="max-w-screen-lg w-full">

            <label className="pt-10 block mt-2 text-md font-medium text-gray-900 text-black">Task details</label>

            <input onChange={(e) => {
                setTitle(e.target.value);
            }} type="text" id="first_name" className="ml-4 mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="What is your task?" required />

            <label className="pb-10 block mt-8 text-md font-medium text-gray-900 text-black">Add Images</label>
            <div className="flex justify-center pt-4 max-w-screen-lg">
                {images.map(image => <UploadImage image={image} onImageAdded={(imageUrl) => {
                    setImages(i => [...i, imageUrl]);
                }} />)}
            </div>

        <div className="ml-4 pt-2 flex justify-center">
            <UploadImage onImageAdded={(imageUrl) => {
                setImages(i => [...i, imageUrl]);
            }} />
        </div>

        <div className="flex justify-center">
            <button onClick={async () => {
                await makePayment();
                await onSubmit()
            }} type="button" className="submit-button ml-8 mt-6 text-white bg-gray-200 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:however:bg-gray-700 dark:focus:ring-gray-700 dark:boder-gray-700">
                Submit Task
            </button>
        </div>
    </div>
    </div>
};