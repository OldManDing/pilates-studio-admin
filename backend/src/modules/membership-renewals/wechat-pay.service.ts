import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDecipheriv, createPrivateKey, createVerify, randomBytes, sign } from 'crypto';

type RenewalOrderInput = {
  transactionId: string;
  transactionCode: string;
  amountCents: number;
  description: string;
  openId: string;
  attach: string;
};

type UnifiedOrderResponse = {
  prepay_id?: string;
};

type NotifyResource = {
  ciphertext: string;
  nonce: string;
  associated_data?: string;
};

type NotifyBody = {
  id: string;
  event_type: string;
  resource_type: string;
  resource: NotifyResource;
};

type DecryptedNotifyResource = {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  amount?: {
    total?: number;
  };
};

export type ParsedPaymentNotification = {
  outTradeNo: string;
  transactionId: string;
  tradeState: string;
  amountCents: number;
};

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);

  constructor(private readonly configService: ConfigService) {}

  isMockMode() {
    return this.configService.get<boolean>('wechatPay.mock') === true;
  }

  async createRenewalPayment(input: RenewalOrderInput) {
    if (this.isMockMode()) {
      return {
        mode: 'MOCK' as const,
        paymentParams: {
          timeStamp: String(Math.floor(Date.now() / 1000)),
          nonceStr: randomBytes(16).toString('hex'),
          package: `mock_prepay_id=${input.transactionId}`,
          signType: 'RSA' as const,
          paySign: 'MOCK_PAY_SIGN',
        },
        paymentOrderNo: `MOCK-${input.transactionCode}`,
        paymentPrepayId: `mock_prepay_${input.transactionId}`,
      };
    }

    const appId = this.getRequiredConfig('wechat.appId');
    const mchId = this.getRequiredConfig('wechatPay.mchId');
    const notifyUrl = this.getRequiredConfig('wechatPay.notifyUrl');

    const requestBody = {
      appid: appId,
      mchid: mchId,
      description: input.description,
      out_trade_no: input.transactionCode,
      notify_url: notifyUrl,
      amount: {
        total: input.amountCents,
        currency: 'CNY',
      },
      payer: {
        openid: input.openId,
      },
      attach: input.attach,
    };

    const response = await this.callWechatPay<UnifiedOrderResponse>('/v3/pay/transactions/jsapi', 'POST', requestBody);
    if (!response.prepay_id) {
      throw new ServiceUnavailableException('WeChat Pay did not return prepay_id');
    }

    const paymentParams = this.buildMiniProgramPaymentParams(appId, response.prepay_id);

    return {
      mode: 'WECHAT_PAY' as const,
      paymentParams,
      paymentOrderNo: input.transactionCode,
      paymentPrepayId: response.prepay_id,
    };
  }

  parseNotification(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    if (this.isMockMode()) {
      const payload = JSON.parse(rawBody) as ParsedPaymentNotification;
      return payload;
    }

    const timestamp = this.getHeaderValue(headers, 'wechatpay-timestamp');
    const nonce = this.getHeaderValue(headers, 'wechatpay-nonce');
    const signature = this.getHeaderValue(headers, 'wechatpay-signature');

    if (!timestamp || !nonce || !signature) {
      throw new BadRequestException('Missing WeChat Pay signature headers');
    }

    this.verifyNotificationSignature(timestamp, nonce, rawBody, signature);

    const payload = JSON.parse(rawBody) as NotifyBody;
    const resource = this.decryptResource(payload.resource);
    const amountCents = Number(resource.amount?.total ?? 0);

    return {
      outTradeNo: String(resource.out_trade_no || ''),
      transactionId: String(resource.transaction_id || ''),
      tradeState: String(resource.trade_state || ''),
      amountCents,
    } satisfies ParsedPaymentNotification;
  }

  private async callWechatPay<T>(path: string, method: 'POST' | 'GET', body?: Record<string, unknown>) {
    const mchId = this.getRequiredConfig('wechatPay.mchId');
    const serialNo = this.getRequiredConfig('wechatPay.merchantSerialNumber');
    const privateKeyPem = this.getRequiredConfig('wechatPay.privateKey');
    const privateKey = createPrivateKey(privateKeyPem.replace(/\\n/g, '\n'));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomBytes(16).toString('hex');
    const bodyString = body ? JSON.stringify(body) : '';
    const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${bodyString}\n`;
    const signature = sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64');

    const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`,
      },
      body: bodyString || undefined,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      this.logger.error(`WeChat Pay request failed: ${response.status} ${JSON.stringify(payload)}`);
      throw new ServiceUnavailableException(payload?.message || 'WeChat Pay request failed');
    }

    return payload as T;
  }

  private buildMiniProgramPaymentParams(appId: string, prepayId: string) {
    const nonceStr = randomBytes(16).toString('hex');
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const packageValue = `prepay_id=${prepayId}`;
    const privateKeyPem = this.getRequiredConfig('wechatPay.privateKey');
    const privateKey = createPrivateKey(privateKeyPem.replace(/\\n/g, '\n'));
    const message = `${appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
    const paySign = sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64');

    return {
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: 'RSA' as const,
      paySign,
    };
  }

  private verifyNotificationSignature(timestamp: string, nonce: string, rawBody: string, signatureValue: string) {
    const publicKeyPem = this.getRequiredConfig('wechatPay.platformPublicKey');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
    verifier.end();

    const publicKey = publicKeyPem.replace(/\\n/g, '\n');
    const isValid = verifier.verify(publicKey, signatureValue, 'base64');
    if (!isValid) {
      throw new BadRequestException('Invalid WeChat Pay signature');
    }
  }

  private decryptResource(resource: NotifyResource) {
    const apiV3Key = this.getRequiredConfig('wechatPay.apiV3Key');
    const key = Buffer.from(apiV3Key, 'utf8');
    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    const nonce = Buffer.from(resource.nonce, 'utf8');
    const associatedData = Buffer.from(resource.associated_data || '', 'utf8');
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
    const dec = createDecipheriv('aes-256-gcm', key, nonce);
    dec.setAuthTag(authTag);
    dec.setAAD(associatedData);
    const plaintext = Buffer.concat([dec.update(encrypted), dec.final()]).toString('utf8');
    return JSON.parse(plaintext) as DecryptedNotifyResource;
  }

  private getRequiredConfig(path: string) {
    const value = this.configService.get<string>(path);
    if (!value) {
      throw new ServiceUnavailableException(`Missing WeChat Pay config: ${path}`);
    }
    return value;
  }

  private getHeaderValue(headers: Record<string, string | string[] | undefined>, key: string) {
    const value = headers[key] ?? headers[key.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
