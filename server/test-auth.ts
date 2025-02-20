import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashedPassword, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 32)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function test() {
  const password = "admin123";
  const hashedPassword = await hashPassword(password);
  console.log('Generated hash:', hashedPassword);
  return hashedPassword;
}

test().then(hash => {
  console.log('Use this hash for the admin account:', hash);
}).catch(console.error);