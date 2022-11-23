import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import { send } from "@ayshptk/msngr";
import { CandyPay } from "@candypay/checkout-sdk";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/webhook", async (req: Request, res: Response) => {
  const payload = req.body;
  const signature = req.headers["x-candypay-signature"];

  const candypay = new CandyPay({
    api_key: process.env.CANDYPAY_API_KEY!,
    network: "devnet",
    config: {
      collect_shipping_address: false,
    },
  });

  try {
    await candypay.webhook.verify({
      payload,
      signature: signature as string,
      webhook_secret: process.env.WEBHOOK_SECRET!,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Invalid webhook signature",
    });
  }

  fs.appendFileSync("events.log", `\n [${Date.now()}]: ${payload.signature}`, {
    encoding: "utf-8",
  });

  await send(
    process.env.DISCORD_WEBHOOK_URL!,
    `💸 New payment webhook alert - ${payload.signature}`
  );

  return res.send();
});

app.listen(3001, () => {
  console.log(`web-h00ks`);
});
