/* eslint-disable no-bitwise */
/* eslint-disable max-classes-per-file */
import * as forge from 'node-forge';
import log from 'electron-log';
import AuthObject from '../interfaces/AuthObject';

class UniversalStore {
  // eslint-disable-next-line class-methods-use-this
  get(key: string): unknown {
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(`fluig_store_${key}`);
        if (!val) return undefined;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  set(key: string, value: unknown): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        `fluig_store_${key}`,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    }
  }
}

interface ConstructorProps {
  payload: string;
  hash: string;
  environmentId: number;
  secret?: string;
}

export default class AuthKeysDecoder {
  /**
   * the environment id referenced by the keys
   */
  environmentId: number;

  /**
   * the payload string
   */
  payload: string;

  /**
   * the decoder hash
   */
  hash: string;

  /**
   * the decoder secret
   */
  secret: string;

  /**
   * The decoded AuthObject
   */
  decoded: AuthObject | null;

  constructor({ payload, hash, secret, environmentId }: ConstructorProps) {
    this.payload = payload;
    this.hash = hash;
    this.secret = secret || '';
    this.environmentId = environmentId;
    this.decoded = {
      accessToken: '',
      consumerKey: '',
      consumerSecret: '',
      tokenSecret: '',
    };
  }

  /**
   * Attempts to self-heal AES-CBC payload when the IV is misaligned
   * by recalculating the real IV based on the known first block `{"consumerKey":"`
   */
  private trySelfHealingIv(
    keyBytes: string,
    rawOutput: string,
    currentIvBytes: string,
    store: UniversalStore
  ): AuthObject | null {
    try {
      const rawBuffer = Buffer.from(rawOutput, 'binary');
      const marker = Buffer.from('","consumerSecret":"', 'utf8');
      const markerIdx = rawBuffer.indexOf(marker);

      if (markerIdx > 16) {
        const expectedPrefix = Buffer.from('{"consumerKey":"', 'utf8');
        const ivBuffer = Buffer.from(currentIvBytes, 'binary');
        const correctedIv = Buffer.alloc(16);

        for (let i = 0; i < 16; i += 1) {
          correctedIv[i] = ivBuffer[i] ^ rawBuffer[i] ^ expectedPrefix[i];
        }

        const recoveryDecipher = forge.cipher.createDecipher(
          'AES-CBC',
          keyBytes
        );
        recoveryDecipher.start({ iv: correctedIv.toString('binary') });
        recoveryDecipher.update(
          forge.util.createBuffer(forge.util.decode64(this.payload))
        );

        if (recoveryDecipher.finish()) {
          const recovered = JSON.parse(recoveryDecipher.output.data);
          const correctedIvBase64 = correctedIv.toString('base64');
          store.set(`envToken_${this.environmentId}`, correctedIvBase64);
          log.info(
            `AuthKeysDecoder: Successfully auto-healed misaligned IV for environment ${this.environmentId}`
          );
          return recovered;
        }
      }
    } catch (e) {
      log.warn(`AuthKeysDecoder: Self-healing IV failed: ${e}`);
    }
    return null;
  }

  /**
   * decodes the auth object accordingly
   * @returns {AuthObject} the decoded AuthObject
   */
  decode(): AuthObject | null {
    try {
      if (this.hash === 'json') {
        this.decoded = JSON.parse(this.payload);
      } else if (this.hash.indexOf('forge:') === 0) {
        const store = new UniversalStore();
        const hashContent = this.hash.slice(6);
        const parts = hashContent.split(':');
        const keyBase64 = parts[0];
        let ivBase64 = parts[1] || '';

        if (!ivBase64) {
          ivBase64 =
            (store.get(`envToken_${this.environmentId}`) as string) || '';
        }

        const keyBytes = forge.util.decode64(keyBase64);

        if (!ivBase64) {
          const zeroIv = Buffer.alloc(16).toString('binary');
          const testDecipher = forge.cipher.createDecipher('AES-CBC', keyBytes);
          testDecipher.start({ iv: zeroIv });
          testDecipher.update(
            forge.util.createBuffer(forge.util.decode64(this.payload))
          );
          testDecipher.finish();

          const healed = this.trySelfHealingIv(
            keyBytes,
            testDecipher.output.data,
            zeroIv,
            store
          );
          if (healed) {
            this.decoded = healed;
            return this.decoded;
          }

          log.warn(
            `AuthKeysDecoder: No token/IV found and recovery failed for environment ${this.environmentId}`
          );
          return null;
        }

        this.secret = ivBase64;
        const ivBytes = forge.util.decode64(ivBase64);

        const decipher = forge.cipher.createDecipher('AES-CBC', keyBytes);
        decipher.start({ iv: ivBytes });
        decipher.update(
          forge.util.createBuffer(forge.util.decode64(this.payload))
        );

        if (!decipher.finish()) {
          const rawOutput = decipher.output.data;
          const healed = this.trySelfHealingIv(
            keyBytes,
            rawOutput,
            ivBytes,
            store
          );
          if (healed) {
            this.decoded = healed;
            return this.decoded;
          }

          log.warn(
            `AuthKeysDecoder: Decryption failed for environment ${this.environmentId}`
          );
          return null;
        }

        const rawOutput = decipher.output.data;
        try {
          this.decoded = JSON.parse(rawOutput);
        } catch {
          const healed = this.trySelfHealingIv(
            keyBytes,
            rawOutput,
            ivBytes,
            store
          );
          if (healed) {
            this.decoded = healed;
            return this.decoded;
          }
          return null;
        }
      }

      return this.decoded;
    } catch (e) {
      log.warn(`AuthKeysDecoder: Error decoding auth keys: ${e}`);
      return null;
    }
  }
}
