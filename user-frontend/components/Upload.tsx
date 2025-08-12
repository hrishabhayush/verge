"use client";
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { ethers } from "ethers";

export const Upload = () => {
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
    const { address, isConnected } = useAccount();

    const { sendTransactionAsync } = useSendTransaction();
    const router = useRouter();

    // Wait for transaction confirmation
    const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    async function onSubmit() {
        const response = await axios.post(`${BACKEND_URL}/v1/user/task`, {
            options: images.map(image => ({
                imageUrl: image,
            })),
            title,
            signature: txHash
        }, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        });

        router.push(`/task/${response.data.id}`);
    }

    async function makePayment() {
        if (!address) {
            alert("Wallet is not connected. Please connect your wallet.");
            return;
        }

        const recipientAddress = "0xB0e869fe03aa591ADFc6BA4C3F4407B9d85B46dE";

        const hash = await sendTransactionAsync({
            to: recipientAddress as `0x${string}`,
            value: ethers.parseEther("0.1"), 
        });

        setTxHash(hash);
    }

    // Auto-submit when transaction is confirmed
    useEffect(() => {
        if (isConfirmed && txHash) {
            onSubmit();
        }
    }, [isConfirmed, txHash]);

    return (
        <div className="flex justify-center">
            <div className="max-w-screen-lg w-full">
                <div className="text-2xl text-left pt-20 w-full pl-4">
                    Create a task
                </div>

                <label className="pl-4 block mt-2 text-md font-medium text-gray-900 text-black">
                    Task details
                </label>

                <input 
                    onChange={(e) => setTitle(e.target.value)} 
                    type="text" 
                    className="ml-4 mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
                    placeholder="What is your task?" 
                    required 
                />

                <label className="pl-4 block mt-8 text-md font-medium text-gray-900 text-black">
                    Add Images
                </label>
                
                <div className="flex justify-center pt-4 max-w-screen-lg">
                    {images.map((image, index) => (
                        <UploadImage 
                            key={index}
                            image={image} 
                            onImageAdded={(imageUrl) => {
                                setImages(i => [...i, imageUrl]);
                            }} 
                        />
                    ))}
                </div>

                <div className="ml-4 pt-2 flex justify-center">
                    <UploadImage onImageAdded={(imageUrl) => {
                        setImages(i => [...i, imageUrl]);
                    }} />
                </div>

                <div className="pl-6 flex justify-center">
                    <button 
                        onClick={txHash && isConfirmed ? onSubmit : makePayment} 
                        type="button" 
                        className="mt-4 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2"
                    >
                        {txHash && isConfirmed ? "Submit Task" : "Pay 0.1 XRP"}
                    </button>
                </div>
            </div>
        </div>
    );
};