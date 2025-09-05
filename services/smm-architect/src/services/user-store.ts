import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  tenantId: string;
}

const USERS_FILE = process.env.USER_STORE_PATH || path.join(__dirname, '..', 'data', 'users.json');

async function readUsers(): Promise<StoredUser[]> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data) as StoredUser[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function findUser(email: string, tenantId?: string): Promise<StoredUser | undefined> {
  const users = await readUsers();
  return users.find(u => u.email === email && (!tenantId || u.tenantId === tenantId));
}

export async function verifyUser(email: string, tenantId: string, password: string): Promise<StoredUser | null> {
  const user = await findUser(email, tenantId);
  if (!user) return null;
  const hashed = hashPassword(password);
  return user.passwordHash === hashed ? user : null;
}

export async function createUser(user: { email: string; password: string; name: string; tenantId: string; }): Promise<StoredUser> {
  const users = await readUsers();
  if (users.some(u => u.email === user.email && u.tenantId === user.tenantId)) {
    throw new Error('User already exists');
  }
  const newUser: StoredUser = {
    id: `user_${crypto.randomUUID()}`,
    email: user.email,
    passwordHash: hashPassword(user.password),
    name: user.name,
    tenantId: user.tenantId
  };
  users.push(newUser);
  await writeUsers(users);
  return newUser;
}
