import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import web3utils from 'web3-utils';
import ethUtil from 'ethereumjs-util';

const JWT_SECRET = process.env.AUTH_SECRET || 'eticapool-auth-secret-change-me';
const JWT_EXPIRY = '24h';
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export default class AuthHelper {
  static generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  static buildSignMessage(nonce, address) {
    return `Sign in to Etica Pool\nNonce: ${nonce}\nAddress: ${address.toLowerCase()}`;
  }

  static async createNonce(address, mongoInterface) {
    if (!address || !web3utils.isAddress(address)) {
      throw new Error('Invalid address');
    }
    const addr = address.toLowerCase();
    const nonce = AuthHelper.generateNonce();
    // Remove any existing nonce for this address
    await mongoInterface.deleteOne('auth_nonces', { address: addr });
    await mongoInterface.insertOne('auth_nonces', {
      address: addr,
      nonce,
      createdAt: new Date()
    });
    const message = AuthHelper.buildSignMessage(nonce, addr);
    return { nonce, message };
  }

  static async verifySignature(address, signature, nonce, mongoInterface) {
    if (!address || !web3utils.isAddress(address)) {
      throw new Error('Invalid address');
    }
    const addr = address.toLowerCase();

    // Look up the nonce in DB
    const nonceDoc = await mongoInterface.findOne('auth_nonces', { address: addr, nonce });
    if (!nonceDoc) {
      throw new Error('Invalid or expired nonce');
    }

    // Check expiry manually (TTL index may not have cleaned up yet)
    if (Date.now() - new Date(nonceDoc.createdAt).getTime() > NONCE_EXPIRY_MS) {
      await mongoInterface.deleteOne('auth_nonces', { address: addr, nonce });
      throw new Error('Nonce expired');
    }

    // Build the message that was signed
    const message = AuthHelper.buildSignMessage(nonce, addr);

    // Recover the signer address using ethereumjs-util (same as etica-socialnetwork-api)
    let ethAddress;
    try {
      const msgBuffer = Buffer.from(message);
      const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
      const sigParams = ethUtil.fromRpcSig(signature);
      const publicKey = ethUtil.ecrecover(msgHash, sigParams.v, sigParams.r, sigParams.s);
      const recoveredAddress = ethUtil.pubToAddress(publicKey).toString('hex');
      ethAddress = `0x${recoveredAddress}`;
    } catch (err) {
      throw new Error('Invalid signature');
    }

    if (!ethAddress || ethAddress.toLowerCase() !== addr) {
      throw new Error('Signature does not match address');
    }

    // Delete the used nonce
    await mongoInterface.deleteOne('auth_nonces', { address: addr, nonce });

    // Generate JWT
    const token = AuthHelper.generateToken(addr);
    return { token, address: addr };
  }

  static generateToken(address) {
    return jwt.sign({ address: address.toLowerCase() }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.address;
    } catch (err) {
      return null;
    }
  }

  static authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    const address = AuthHelper.verifyToken(token);
    if (!address) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.minerAddress = address;
    next();
  }
}
