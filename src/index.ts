import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fs from "node:fs";

import { Webhook } from "./lib/verify";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/webhook", async (req: Request, res: Response) => {
  const payload = req.body;
  const signature = req.headers["x-candypay-signature"];

  const webhook = new Webhook({
    header: signature as string,
    payload,
    secret: process.env.WEBHOOK_SECRET!,
  });

  try {
    webhook.verify();
  } catch (err) {
    return res.status(400).json({
      message: "invalid webhook signature",
    });
  }

  fs.writeFileSync("events.log", payload.event, {
    encoding: "utf-8",
  });

  return res.send();
});
