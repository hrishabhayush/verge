import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import jwt from "jsonwebtoken"
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createTaskInput } from "../types";
import nacl from "tweetnacl";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/3GHuEu4-cXEuE8jDAZW3EFgTedkyJ0K3');

const PARENT_WALLET_ADDRESS = "7W5nwpKWd4MfocNsXHNdUmhngziVRjL4fuyBHrJG4kZC"
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

    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs"
        })
    }

    const transaction = await connection.getTransaction(parseData.data.signature, {
        maxSupportedTransactionVersion: 1
    });

    console.log(transaction);

    if ((transaction?.meta?.postBalances[1] ?? 0) - (transaction?.meta?.preBalances[1] ?? 0) !== 100000) {
        return res.status(411).json({
            message: "Transaction signature/amount incorrect"
        })
    }

    if (transaction?.transaction.message.getAccountKeys().get(1)?.toString() !== PARENT_WALLET_ADDRESS) {
        return res.status(411).json({
            message: "Transaction sent to wrong address"
        })
    }

    if (transaction?.transaction.message.getAccountKeys().get(0)?.toString() !== user?.address) {
        return res.status(411).json({
            message: "Transaction sent to wrong address"
        })
    }
    // was this money paid by this user address or a different address?

    // parse the signature here to ensure the person has paid 0.1 SOL
    // const transaction = Transaction.from(parseData.data.signature);

    let response = await prismaClient.$transaction(async tx => {

        const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: 1 * TOTAL_DECIMALS,
                //TODO: Signature should be unique in the table else people can reuse a signature
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })

        return response;

    })

    res.json({
        id: response.id
    })


});

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

    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
        })
    }

    // parse the signature to ensure the user has paid

    let response = await prismaClient.$transaction(async tx => {

        const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: 0.1 * TOTAL_DECIMALS,
                //TODO: Signature should be unique in the table else people can reuse a signature
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })

        return response;

    })

    res.json({
        id: response.id
    })

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
router.post("/signin", async(req, res) => {
    // sign verification logic here
    const { publicKey, signature } = req.body;
    const message = new TextEncoder().encode("Sign in to decentralized fiver website");

    const result = nacl.sign.detached.verify(
        message,
        new Uint8Array(signature.data),
        new PublicKey(publicKey).toBytes(),
      );


    console.log(result);
    
    // If the user with this wallet address already exists, then it will just return userId
    // Otherwise creates the userId for that user
    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: publicKey
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRET)

        res.json({
            token
        })
    } else {

        const user = await prismaClient.user.create({
            data: {
                address: publicKey,
            }
        })

        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)

        res.json({
            token
        })
    }
});

export default router;