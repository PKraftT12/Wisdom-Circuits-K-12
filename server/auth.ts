import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;

  try {
    const [hash, salt] = stored.split('.');
    if (!hash || !salt) return false;

    const hashBuffer = Buffer.from(hash, 'hex');
    const suppliedBuffer = (await scryptAsync(supplied, salt, 32)) as Buffer;

    return timingSafeEqual(hashBuffer, suppliedBuffer);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  app.set('trust proxy', 1);

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'wisdom.sid',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        console.log('Login attempt for:', email);
        const user = await storage.getUserByEmail(email);

        if (!user) {
          console.log('User not found');
          return done(null, false, { message: "Invalid email or password" });
        }

        console.log('Found user:', user.id);
        const isValid = await comparePasswords(password, user.password);
        console.log('Password validation result:', isValid);

        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login request received:', {
      email: req.body.email,
      hasPassword: !!req.body.password
    });

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ message: "Authentication error" });
      }

      if (!user) {
        console.log('Login failed:', info?.message);
        return res.status(401).json({ message: info?.message || "Login failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Login error" });
        }
        console.log('Login successful for user:', user.id);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password } = req.body;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('Logging out user:', userId);

    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      console.log('Successfully logged out user:', userId);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}