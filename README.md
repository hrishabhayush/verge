# Verge

## Problem

Choosing pictures is tricky. 

## Insights

What if you could just get feedback from a small group of people?

## Solution

An application to ease the task of choosing thumbnails for your next YT video that will generate maximum CTR / Instagram cover picture that will get engagement / Dating apps profile picture that will get matches. All this happens through decentralized voting.

## Setup Instructions

### Prerequisites

- Clone the github repo or fork it
```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>
```

- Have an XRPL EVM Sidechain Testnet enabled on Metamask extension with funded wallets. 

### Further steps

There are three folders for this project. We will set up each of them individually individually in three different terminals. 

- Backend

Setting up the env variables. Follow the instruction in .env.example

```bash
cp .env.example .env
```

Then starting the backend: 

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
tsc -b
node dist/index.js
```

This starts the backend on port 3000.

- User Frontend

Setting up the env variables. Add the cloudfront url from AWS.

```bash
cp.env.example
```

```bash
cd user-frontend
npm install && npm run dev
```

This starts the user-frontend on port 3001 where the users can upload the picture and create a rewards pool. 

- Worker Frontend

Setting up the env variables. Add the cloudfront url from AWS

```bash
cp .env.example .env
```

Then starting the worker-frontend:

```bash
cd worker-frontend
npm install && npm run dev
```
This starts the worker-frontend on port 3002 where the workers can vote on the picture sand earn a reward if they are in the majority. 

Now you should be able to upload images as well as 
