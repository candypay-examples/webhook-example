import express, { Request, Response } from "express";
import { CandyPay } from "@candypay/checkout-sdk";
import { send } from "@ayshptk/msngr";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/", async (req: Request, res: Response) => {
  const headers = req.headers;
  const payload = req.body;

  const candypay = new CandyPay({
    api_key: process.env.CANDYPAY_API_KEY!,
    network: "devnet",
    config: {
      collect_shipping_address: false,
    },
  });

  try {
    await candypay.webhook.verify({
      payload: JSON.stringify(payload),
      headers: headers as Record<string, string>,
      webhook_secret: process.env.WEBHOOK_SECRET!,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Invalid webhook signature",
    });
  }

  // send a discord message via webhooks
  await send(
    process.env.DISCORD_WEBHOOK_URL!,
    `💸 New payment webhook alert - https://explorer.solana.com/tx/${payload.signature}`
  );

  return res.send();
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
});
