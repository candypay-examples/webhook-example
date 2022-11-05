import crypto from "node:crypto";

type SignedHeader = {
  timestamp: number;
  signatures: string[];
};

interface ConfigOpts {
  payload: any;
  header: string;
  secret: string;
}

export class Webhook {
  private payload;
  private header;
  private secret;

  constructor(options: ConfigOpts) {
    this.payload = options.payload;
    this.header = options.header;
    this.secret = options.secret;
  }

  verify() {
    const signedHeader = this.parseSignatureHeader();

    if (!signedHeader.signatures.length) {
      throw new Error("Webhook has no valid signature");
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.secret)
      .update(JSON.stringify(this.payload), "utf8")
      .digest("hex");

    return this.validateComputedSignature(
      signedHeader.signatures,
      expectedSignature
    );
  }

  private parseSignatureHeader(): SignedHeader {
    const header = this.header;

    if (typeof header !== "string") {
      throw new Error("Webhook has invalid header");
    }

    let signature: SignedHeader = {
      timestamp: -1,
      signatures: [],
    };

    const parts = header.split(",");

    signature =
      parts.length > 1
        ? this.decodeAdvanced(signature, parts)
        : this.decodeSimple(signature, this.header);
    return signature;
  }

  private decodeAdvanced(sh: SignedHeader, pairs: string[]): SignedHeader {
    pairs.map((sig: string) => {
      const item = sig.split("=").slice(1).join("=");
      if (isNaN(Number(item))) {
        // We're not dealing with a timestamp at this point
        sh.signatures.push(item);
      } else {
        sh.timestamp = parseInt(item, 10);
      }
    });

    if (!sh.timestamp || sh.timestamp === -1) {
      throw new Error("Webhook has invalid header");
    }

    const timestampAge = Math.floor(Date.now() / 1000) - sh.timestamp;

    if (timestampAge > 300) {
      throw new Error("Timestamp has expired");
    }

    return sh;
  }

  private decodeSimple(sh: SignedHeader, header: string): SignedHeader {
    sh.signatures.push(header);
    return sh;
  }

  private validateComputedSignature(
    signatures: string[],
    expectedSignature: string
  ) {
    const signatureFound = signatures.filter((signature) => {
      return this.secureCompare(signature, expectedSignature);
    });

    if (!signatureFound.length) {
      throw new Error("Webhook has no valid signature");
    }

    return true;
  }

  private secureCompare(a: any, b: any): boolean {
    a = Buffer.from(a);
    b = Buffer.from(b);

    if (a.length != b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  }
}
