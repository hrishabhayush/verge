import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import jwt from "jsonwebtoken"
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createTaskInput } from "../types";
import { ethers} from "ethers";
import { verifyMessage} from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.testnet.xrplevm.org");

const PARENT_WALLET_ADDRESS = "0xB0e869fe03aa591ADFc6BA4C3F4407B9d85B46dE"; 

const DEFAULT_TITLE = "Select the most engaging thumbnail/picture";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.ACCESS_SECRET ?? "",
    },
    region: "us-east-1"
})

const router = Router();

const prismaClient = new PrismaClient();

prismaClient.$transaction(
    async (prisma) => {
        // Code running in a transaction ...
    },
    {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
    }
)

router.get("/task", authMiddleware, async (req, res) => {
    // @ts-ignore
    const taskId: string = req.query.taskId;
    // @ts-ignore
    const userId: string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    })

    if (!taskDetails) {
        return res.status(411).json({
            message: "You dont have access to this task"
        })
    }

    // Todo: Can u make this faster?
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });

    const result: Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0,
            option: {
                imageUrl: option.image_url
            }
        }
    })

    responses.forEach(r => {
        result[r.option_id].count++;
    });

    res.json({
        result,
        taskDetails
    })

})

router.post("/task", authMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId
    // validate the inputs from the user;
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    const user = await prismaClient.user.findFirst({
        where: {
            id: userId
        }
    })

    console.log("[TASK] body:", req.body);
    console.log("[TASK] user:", { userId, userAddress: user?.address });

    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
        })
    }

    // parse the signature to ensure the user has paid
    try {
        // Get transaction from XRP EVM testnet
        const transaction = await provider.getTransaction(parseData.data.signature);
        
        if (!transaction) {
            return res.status(411).json({
                message: "Transaction not found"
            });
        }

        const receipt = await provider.getTransactionReceipt(parseData.data.signature);
        console.log("[TASK] tx:", transaction?.hash, { from: transaction?.from, to: transaction?.to, value: transaction?.value?.toString() });
        console.log("[TASK] receipt:", { has: !!receipt, status: receipt?.status });

        if (!receipt || receipt.status !== 1) {
            return res.status(411).json({
                message: "Transaction failed or not confirmed"
            });
        }

        const expectedAmount = ethers.parseEther("0.1");
        if (transaction.value !== expectedAmount) {
            return res.status(411).json({
                message: "Transaction amount is incorrect"
            });
        }

        if (transaction.to?.toLowerCase() !== PARENT_WALLET_ADDRESS.toLowerCase()) {
            return res.status(411).json({
                message: "Transaction is not to the correct wallet"
            });
        }

        if (transaction.from?.toLowerCase() !== user?.address?.toLowerCase()) {
            return res.status(411).json({
                message: "Transaction is not from the correct wallet"
            });
        }

        console.log("[TASK] value check:", { tx: transaction?.value?.toString(), expected: ethers.parseEther("0.1").toString() });
        console.log("[TASK] to check:", { tx: transaction?.to, expected: PARENT_WALLET_ADDRESS });
        console.log("[TASK] from check:", { tx: transaction?.from, user: user?.address });

        // If all the above checks pass, then we can create the task
        let response = await prismaClient.$transaction(async tx => {
            const response = await tx.task.create({
                data: {
                    title: parseData.data.title ?? DEFAULT_TITLE,
                    amount: 0.1 * TOTAL_DECIMALS,
                    signature: parseData.data.signature,
                    user_id: userId
                }
            })
            
            await tx.option.createMany({
                data: parseData.data.options.map(x => ({
                    image_url: x.imageUrl,
                    task_id: response.id
                }))
            });

            return response;
        });

        return res.json({
            id: response.id
        });

    } catch (e) {
        return res.status(411).json({
            message: "Transaction failed"
        });
    }
});

router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId; 

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'decentralized-apps',
        Key: `fiver/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Fields: {
            'Content-Type': 'image/png'
        },
        Expires: 3600
    })

    res.json({
        preSignedUrl: url, 
        fields
    })
});

// sign in with wallet (most decentralized applications follow this where you 
// connect with Phantom wallet)
// signing a message
router.post("/signin", async (req, res) => {
    const { publicKey, signature } = req.body as { publicKey?: string; signature?: string };
    const message = "Sign into Verge for voting";

    if (!publicKey || !signature) {
        return res.status(411).json({ message: "Missing publicKey or signature" });
    }

    try {
        console.log("[SIGNIN] incoming:", { publicKey, signatureLength: signature.length });
        const recoveredAddress = verifyMessage(message, signature);
        console.log("[SIGNIN] recovered vs provided:", { recoveredAddress, publicKey });

        if (recoveredAddress.toLowerCase() !== publicKey.toLowerCase()) {
            return res.status(411).json({ message: "Invalid signature" });
        }

        const existingUser = await prismaClient.user.findFirst({
            where: { address: publicKey.toLowerCase() }
        });

        if (existingUser) {
            const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET);
            return res.json({ token });
        }

        const user = await prismaClient.user.create({
            data: { address: publicKey.toLowerCase() }
        });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        return res.json({ token });
    } catch (e) {
        console.error("[SIGNIN] verify error:", e);
        return res.status(411).json({ message: "Invalid signature" });
    }
});

export default router;