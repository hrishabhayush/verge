import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../middleware";
import { TOTAL_DECIMALS, WORKER_JWT_SECRET } from "../config";
import { getNextTask } from "../db";
import { createSubmissionInput } from "../types";
import { ethers, verifyMessage } from "ethers";

const prisma = new PrismaClient();
const router = Router();

const TOTAL_SUBMISSIONS = 5;

// XRPL EVM testnet RPC (update if you use a different one)
const provider = new ethers.JsonRpcProvider("https://rpc.testnet.xrplevm.org/");

const PAYER_PRIVATE_KEY = process.env.PRIVATE_KEY!;
const signer = PAYER_PRIVATE_KEY ? new ethers.Wallet(PAYER_PRIVATE_KEY, provider) : undefined;

// Routes

router.post("/signin", async (req, res) => {
  const { publicKey, signature } = req.body as { publicKey?: string; signature?: string };
  const message = "Sign into Verge for voting on tasks";

  if (!publicKey || !signature) {
    return res.status(411).json({ message: "Missing publicKey or signature" });
  }

  try {
    const recovered = verifyMessage(message, signature);
    if (recovered.toLowerCase() !== publicKey.toLowerCase()) {
      return res.status(411).json({ message: "Incorrect signature" });
    }

    const existing = await prisma.worker.findFirst({
      where: { address: publicKey.toLowerCase() },
    });

    if (existing) {
      const token = jwt.sign({ userId: existing.id }, WORKER_JWT_SECRET);
      return res.json({
        token,
        amount: existing.pending_amount / TOTAL_DECIMALS,
      });
    }

    const user = await prisma.worker.create({
      data: {
        address: publicKey.toLowerCase(),
        pending_amount: 0,
        locked_amount: 0,
      },
    });

    const token = jwt.sign({ userId: user.id }, WORKER_JWT_SECRET);
    return res.json({
      token,
      amount: 0,
    });
  } catch (e) {
    return res.status(411).json({ message: "Incorrect signature" });
  }
});

router.get("/balance", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: number = req.userId;

  const worker = await prisma.worker.findFirst({ where: { id: Number(userId) } });

  return res.json({
    pendingAmount: worker?.pending_amount ?? 0,
    lockedAmount: worker?.locked_amount ?? 0,
  });
});

router.post("/submission", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: number = req.userId;
  const body = req.body;
  const parsed = createSubmissionInput.safeParse(body);

  if (!parsed.success) {
    return res.status(411).json({ message: "Incorrect inputs" });
  }

  const task = await getNextTask(Number(userId));
  if (!task || task.id !== Number(parsed.data.taskId)) {
    return res.status(411).json({ message: "Incorrect task id" });
  }

  const amountUnit = Math.floor(Number(task.amount) / TOTAL_SUBMISSIONS); // 1% per submission if TOTAL_SUBMISSIONS=100
  const submission = await prisma.$transaction(async (tx) => {
    const s = await tx.submission.create({
      data: {
        option_id: Number(parsed.data.selection),
        worker_id: Number(userId),
        task_id: Number(parsed.data.taskId),
        amount: amountUnit,
      },
    });

    await tx.worker.update({
      where: { id: Number(userId) },
      data: { pending_amount: { increment: amountUnit } },
    });
    const totalSubmissions = await tx.submission.count({
      where: {
        task_id: Number(parsed.data.taskId),
      },
    });
    if (totalSubmissions >= TOTAL_SUBMISSIONS) {
        await tx.task.update({
            where: { id : Number(parsed.data.taskId)},
            data: { done: true},
        });
    }

    return s;
  });

  const nextTask = await getNextTask(Number(userId));
  return res.json({ 
    nextTask, 
    amount: amountUnit 
  });
});

router.get("/nextTask", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: number = req.userId;

  const task = await getNextTask(Number(userId));
  if (!task) {
    return res.status(411).json({ message: "No more tasks left for you to review" });
  }
  return res.json({ task });
});

router.post("/payout", workerMiddleware, async (req, res) => {
  if (!signer) {
    return res.status(411).json({ message: "Payout signer not configured" });
  }

  // @ts-ignore
  const userId: number = req.userId;

  // Lock pending -> locked and create 'Processing' payout atomically to prevent double-spend
  const { worker, payout } = await prisma.$transaction(async (tx) => {
    const worker = await tx.worker.findUnique({ where: { id: Number(userId) } });
    if (!worker) {
      throw new Error("User not found");
    }
    if (worker.pending_amount <= 0) {
      throw new Error("Nothing to payout");
    }

    const amountUnits = worker.pending_amount; // in app units
    // Move pending to locked first
    await tx.worker.update({
      where: { id: Number(userId) },
      data: {
        pending_amount: { decrement: amountUnits },
        locked_amount: { increment: amountUnits },
      },
    });

    const payout = await tx.payouts.create({
      data: {
        user_id: Number(userId),
        amount: amountUnits,
        signature: "",
        status: "Processing",
      },
    });

    return { worker, payout };
  }).catch((e) => {
    return { worker: null as any, payout: null as any, error: e as Error };
  });

  if (!worker || !payout) {
    return res.status(411).json({
      message: (payout as any)?.error?.message || (worker as any)?.error?.message || "Payout init failed",
    });
  }

  try {
    // Convert app units -> XRP (18 decimals on EVM side)
    const amountEther = (worker.pending_amount / TOTAL_DECIMALS).toString();
    const tx = await signer.sendTransaction({
      to: worker.address as `0x${string}`,
      value: ethers.parseEther(amountEther),
    });

    // Update payout with tx hash, keep status as 'Processing' or set 'Sent'
    await prisma.payouts.update({
      where: { id: payout.id },
      data: { signature: tx.hash, status: "Success" },
    });

    return res.json({
      message: "Processing payout",
      amount: worker.pending_amount / TOTAL_DECIMALS,
      hash: tx.hash,
    });
  } catch (e) {
    // On failure, revert balances
    await prisma.$transaction(async (tx) => {
      await tx.worker.update({
        where: { id: Number(userId) },
        data: {
          pending_amount: { increment: worker.pending_amount },
          locked_amount: { decrement: worker.pending_amount },
        },
      });
      await tx.payouts.update({
        where: { id: payout.id },
        data: { status: "Failure" },
      });
    });

    return res.status(411).json({ message: "Transaction failed" });
  }
});

export default router;