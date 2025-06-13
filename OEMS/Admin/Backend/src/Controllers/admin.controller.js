import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { UAParser } from "ua-parser-js";
import { connection } from "../server.js";
import {
  BAD_REQUEST,
  NOT_FOUND,
  SERVER_ERROR,
  STATUS_OK,
  UNAUTHORIZED,
} from "../Constants/httpStatus.js";

export const registerUser = async (req, res) => {
  const { name, email, password, otp, otpId } = req.body;

  try {
    let user = await findUserByEmail(email);
    if (user) {
      return res.status(BAD_REQUEST).json({ error: "User already exists" });
    }

    const otpRecord = await findOtpById(otpId);
    if (!otpRecord || otpRecord.is_used || otpRecord.expires_at < Date.now()) {
      return res.status(BAD_REQUEST).json({ error: "Invalid or expired OTP" });
    }
    if (otpRecord.otp !== otp) {
      return res.status(BAD_REQUEST).json({ error: "Incorrect OTP" });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await createUser(userId, name, email, hashedPassword);
    await markOtpAsUsed(otpId);

    res.status(STATUS_OK).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(SERVER_ERROR).json({ error: "Server error" });
  }
};

export const sendOtp = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res
      .status(BAD_REQUEST)
      .json({ error: "Full name, email, and password are required" });
  }

  try {
    let user = await findUserByEmail(email);
    if (user) {
      return res.status(BAD_REQUEST).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await saveOtp(otpId, email, fullName, hashedPassword, otp, expiresAt);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SENDER_MAIL, pass: process.env.PASS_KEY },
    });

    const mailOptions = {
      from: process.env.SENDER_MAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "New User Signup OTP Verification",
      text: `A new user is attempting to register.\n\nName: ${fullName}\nEmail: ${email}\n\nPlease verify this user by providing the OTP: ${otp}\nThis OTP is valid for 10 minutes.`,
      html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registration Request</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Arial', sans-serif;
          background-color: #f4f4f4;
          color: #333333;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background-color: #4a90e2;
          padding: 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          margin: 10px 0;
        }
        .user-details {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .user-details ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .user-details li {
          font-size: 16px;
          margin: 10px 0;
          color: #333333;
        }
        .otp-container {
          text-align: center;
          margin: 30px 0;
        }
        .otp {
          display: inline-block;
          background-color: #4a90e2;
          color: #ffffff;
          font-size: 32px;
          font-weight: bold;
          padding: 15px 25px;
          border-radius: 6px;
          letter-spacing: 5px;
          border: 2px solid #2a6cc0;
        }
        .footer {
          background-color: #f4f4f4;
          padding: 15px;
          text-align: center;
          font-size: 14px;
          color: #666666;
        }
        .footer p {
          margin: 0;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 10px;
          }
          .content {
            padding: 20px;
          }
          .otp {
            font-size: 28px;
            padding: 10px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New User Registration Request</h1>
        </div>
        <div class="content">
          <p>Dear Administrator,</p>
          <p>A new user is attempting to register with the following details:</p>
          <div class="user-details">
            <ul>
              <li><strong>Name:</strong> ${fullName}</li>
              <li><strong>Email:</strong> ${email}</li>
            </ul>
          </div>
          <p>Please verify this user by providing the following OTP to them:</p>
          <div class="otp-container">
            <span class="otp">${otp}</span>
          </div>
          <p><strong>Note:</strong> This OTP is valid for 10 minutes.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,
    };
    await transporter.sendMail(mailOptions);
    res.status(STATUS_OK).json({ message: "OTP sent to admin", otpId });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(SERVER_ERROR).json({ error: "Server error" });
  }
};

export const verifyOtp = async (req, res) => {
  const { otpId, otp } = req.body;

  try {
    const otpRecord = await findOtpById(otpId);
    if (!otpRecord) {
      return res.status(BAD_REQUEST).json({ error: "Invalid OTP ID" });
    }
    if (otpRecord.is_used) {
      return res.status(BAD_REQUEST).json({ error: "OTP already used" });
    }
    if (otpRecord.expires_at < Date.now()) {
      return res.status(BAD_REQUEST).json({ error: "OTP expired" });
    }
    if (otpRecord.otp !== otp) {
      return res.status(BAD_REQUEST).json({ error: "Incorrect OTP" });
    }

    res.status(STATUS_OK).json({ message: "OTP verified", otpId });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(SERVER_ERROR).json({ error: "Server error" });
  }
};

const findUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      }
    );
  });
};

const findUserById = (userId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      }
    );
  });
};

const createUser = (userId, name, email, password) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
      [userId, name, email, password],
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};

const saveOtp = (otpId, email, fullName, password, otp, expiresAt) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO otps (id, email, full_name, password, otp, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      [otpId, email, fullName, password, otp, expiresAt],
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};

const findOtpById = (otpId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM otps WHERE id = ?",
      [otpId],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      }
    );
  });
};

const markOtpAsUsed = (otpId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "UPDATE otps SET is_used = TRUE WHERE id = ?",
      [otpId],
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};

export const editUser = (req, res) => {
  const { userId, newEmail, name, imageUrl } = req.body;

  if (!userId || !newEmail || !name) {
    return res.status(BAD_REQUEST).json({
      message: "userId, newEmail, and name are required",
    });
  }

  const updateQuery = `
    UPDATE users
    SET email = ?, name = ?, imageUrl = ?
    WHERE id = ?
  `;

  connection.query(
    updateQuery,
    [newEmail, name, imageUrl || null, userId],
    (err, result) => {
      if (err) {
        console.error("Error updating user:", err);
        return res.status(SERVER_ERROR).json({
          message: "Failed to update user",
          error: err,
        });
      }

      if (result.affectedRows === 0) {
        return res
          .status(NOT_FOUND)
          .json({ message: "User not found with the provided currentEmail" });
      }

      return res.status(STATUS_OK).json({
        message: "User updated successfully",
        updatedEmail: newEmail,
      });
    }
  );
};

export const getUserByUserId = (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(BAD_REQUEST).json({ message: "Email is required" });
  }

  const query = `SELECT * FROM users WHERE id = ?`;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res
        .status(SERVER_ERROR)
        .json({ message: "Server error", error: err });
    }

    if (results.length === 0) {
      return res.status(NOT_FOUND).json({ message: "User not found" });
    }

    return res.status(STATUS_OK).json(results[0]);
  });
};

export const getActiveSessions = (req, res) => {
  const userId = req.jwtUserId;
  const currentSessionId = req.cookies["sessionId"];

  connection.query(
    `SELECT id, userId, refreshToken, ipAddress, userAgent, browser, os, deviceType, expiresAt
     FROM sessions
     WHERE userId = ? AND isActive = 1`,
    [userId],
    (err, results) => {
      if (err) {
        console.error("Error fetching sessions:", err);
        return res
          .status(SERVER_ERROR)
          .json({ message: "Failed to fetch sessions" });
      }

      const sessions = results.map((session) => ({
        ...session,
        isCurrentSession: session.id === currentSessionId,
      }));

      res.json({ devices: sessions });
    }
  );
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(BAD_REQUEST)
      .json({ error: "Email and password are required" });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(UNAUTHORIZED).json({ error: "Invalid credentials" });
    }

    const sessionId = uuidv4();
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const parser = new UAParser(userAgent);
    const parsed = parser.getResult();

    const browser = parsed.browser?.name || "Unknown";
    const os = parsed.os?.name || "Unknown";
    const deviceType = parsed.device?.type || "desktop";

    const accessToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "1m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.REFRESH_KEY,
      { expiresIn: "1y" }
    );

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    connection.query(
      `INSERT INTO sessions (id, userId, refreshToken, ipAddress, userAgent, browser, os, deviceType, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        user.id,
        refreshToken,
        ipAddress,
        userAgent,
        browser,
        os,
        deviceType,
        expiresAt,
      ],
      (err) => {
        if (err) {
          console.error("DB insert error:", err);
          return res
            .status(SERVER_ERROR)
            .json({ error: "Session creation failed" });
        }

        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 1 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        res.cookie("sessionId", sessionId, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        res.json({ name: user.name, email: user.email, userId: user.id });
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    res.status(SERVER_ERROR).json({ error: "Internal server error" });
  }
};

export const logoutSpecificDevice = (req, res) => {
  const userId = req.jwtUserId;
  const targetSessionId = req.params.sessionId;
  const currentSessionId = req.cookies["sessionId"];

  if (targetSessionId === currentSessionId) {
    return res
      .status(BAD_REQUEST)
      .json({ message: "Cannot delete current session from this route" });
  }

  connection.query(
    `UPDATE sessions SET isActive = 0 
     WHERE id = ? AND userId = ? AND isActive = 1`,
    [targetSessionId, userId],
    (err, result) => {
      if (err) {
        console.error("Error logging out device:", err);
        return res
          .status(SERVER_ERROR)
          .json({ message: "Internal server error" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(NOT_FOUND)
          .json({ message: "Device not found or already logged out" });
      }

      res.status(STATUS_OK).json({ message: "Device logged out successfully" });
    }
  );
};

export const logoutFromAllDevices = (req, res) => {
  const userId = req.jwtUserId;
  const currentSessionId = req.cookies["sessionId"];
  const { exceptCurrent } = req.body;

  let query = `UPDATE sessions SET isActive = 0 WHERE userId = ?`;
  let params = [userId];

  if (exceptCurrent) {
    query += ` AND id != ?`;
    params.push(currentSessionId);
  }

  connection.query(query, params, (err) => {
    if (err) {
      console.error("Logout all devices error:", err);
      return res
        .status(SERVER_ERROR)
        .json({ message: "Internal server error" });
    }

    if (!exceptCurrent) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.clearCookie("sessionId");
    }

    res
      .status(STATUS_OK)
      .json({ message: "Logged out from all devices successfully" });
  });
};

export const logoutUser = async (req, res) => {
  const sessionId = req.cookies["sessionId"];
  const refreshToken = req.cookies["refreshToken"];

  if (!sessionId || !refreshToken) {
    return res.status(BAD_REQUEST).json({ message: "No active session found" });
  }

  connection.query(
    `UPDATE sessions SET isActive = 0 WHERE id = ? AND refreshToken = ?`,
    [sessionId, refreshToken],
    (err, results) => {
      if (err) {
        console.error("Logout DB error:", err);
        return res
          .status(SERVER_ERROR)
          .json({ message: "Internal server error" });
      }

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.clearCookie("sessionId");

      return res.status(STATUS_OK).json({ message: "Logged out successfully" });
    }
  );
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user)
      return res.status(UNAUTHORIZED).json({ error: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const expirationTime = Date.now() + 10 * 60 * 1000;

    await savePasswordResetToken(user.id, hashedToken, expirationTime);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SENDER_MAIL, pass: process.env.PASS_KEY },
    });

    const mailOptions = {
      from: process.env.SENDER_MAIL,
      to: email,
      subject: "Reset your password",
      text: `Click the link to reset your password: ${process.env.PRODUCTION ? 'https://devopsinfoane.site/' : 'http://localhost:5173/'}reset-password/${user.id}/${resetToken}/${expirationTime}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(SERVER_ERROR).json({ error: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { userId, token, expiry } = req.params;
  const { password } = req.body;

  try {
    const user = await findUserById(userId);
    if (!user)
      return res.status(UNAUTHORIZED).json({ error: "User not found" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const tokenRecord = await getPasswordResetToken(userId, hashedToken);

    if (!tokenRecord) {
      return res.status(BAD_REQUEST).json({ error: "Invalid token" });
    }

    if (tokenRecord.is_used) {
      return res
        .status(BAD_REQUEST)
        .json({ error: "Token has already been used" });
    }

    if (
      Date.now() > parseInt(expiry) ||
      tokenRecord.expiration_time < Date.now()
    ) {
      return res.status(BAD_REQUEST).json({ error: "Token has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, hashedPassword);
    await invalidatePasswordResetToken(tokenRecord.id);

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(SERVER_ERROR).json({ error: "Server error" });
  }
};

export const verifyToken = async (req, res) => {
  const { userId, token, expiry } = req.body;

  try {
    const user = await findUserById(userId);
    if (!user)
      return res.status(UNAUTHORIZED).json({ error: "User not found" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const tokenRecord = await getPasswordResetToken(userId, hashedToken);

    if (!tokenRecord) {
      return res.status(BAD_REQUEST).json({ error: "Invalid token" });
    }

    if (tokenRecord.is_used) {
      return res
        .status(BAD_REQUEST)
        .json({ error: "Token has already been used" });
    }

    if (
      Date.now() > parseInt(expiry) ||
      tokenRecord.expiration_time < Date.now()
    ) {
      return res.status(BAD_REQUEST).json({ error: "Token has expired" });
    }

    res.json({ status: true, message: "Token is valid" });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(SERVER_ERROR).json({ error: "Server error" });
  }
};

const savePasswordResetToken = (userId, hashedToken, expirationTime) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO password_reset_tokens (user_id, token, expiration_time) VALUES (?, ?, ?)",
      [userId, hashedToken, expirationTime],
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};

const getPasswordResetToken = (userId, hashedToken) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM password_reset_tokens WHERE user_id = ? AND token = ?",
      [userId, hashedToken],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      }
    );
  });
};

const updateUserPassword = (userId, hashedPassword) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId],
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};

const invalidatePasswordResetToken = (tokenId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "UPDATE password_reset_tokens SET is_used = TRUE WHERE id = ?",
      [tokenId],
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      }
    );
  });
};
