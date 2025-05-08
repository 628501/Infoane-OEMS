import { connection } from "../server.js";

import jwt from "jsonwebtoken";

import {
  BAD_REQUEST,
  SERVER_ERROR,
  STATUS_OK,
  FORBIDDEN,
  UNAUTHORIZED,
  NOT_FOUND,
} from "../Constants/httpStatus.js";

export const candidateLogin = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(BAD_REQUEST)
      .json({ message: "Email and password (mobile) are required" });
  }
  const findCandidateQuery = `
    SELECT * FROM candidate_registration
    WHERE email = ? AND mobile = ?
  `;
  connection.query(
    findCandidateQuery,
    [email, password],
    (err, candidateResults) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(SERVER_ERROR).json({ message: "Server error" });
      }
      if (candidateResults.length === 0) {
        return res
          .status(UNAUTHORIZED)
          .json({ message: "Invalid credentials" });
      }
      const checkSubmissionQuery = `
      SELECT * FROM ValueTable WHERE userEmail = ?
    `;
      connection.query(checkSubmissionQuery, [email], (err2, valueResults) => {
        if (err2) {
          console.error("Error checking submission status:", err2);
          return res.status(SERVER_ERROR).json({ message: "Server error" });
        }
        if (valueResults.length > 0) {
          return res
            .status(FORBIDDEN)
            .json({ message: "User has already submitted the exam" });
        }
        const candidateToken = jwt.sign({ email }, process.env.SECRET_KEY, {
          expiresIn: "45m",
        });
        res.cookie("candidateToken", candidateToken, {
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          maxAge: 45 * 60 * 1000,
        });

        return res.status(STATUS_OK).json({
          message: "Login successful",
          email,
          candidateToken,
        });
      });
    }
  );
};

export const candidateLogout = (req, res) => {
  res.clearCookie("candidateToken");
  return res.status(STATUS_OK).json({ message: "Logout successful" });
};

export const getCandidateSubmission = (req, res) => {
  const { responseId } = req.params;
  const query = `
    SELECT * FROM ValueTable WHERE responseId = ?
  `;

  connection.query(query, [responseId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(SERVER_ERROR).json({ message: "Server error" });
    }

    if (results.length === 0) {
      return res.status(NOT_FOUND).json({ message: "Submission not found" });
    }

    return res.status(STATUS_OK).json(results[0]);
  });
};

export const submitForm = (req, res) => {
  const { formId } = req.params;
  const { responseId, userEmail, startTime, termsAccepted } = req.body;

  if (!formId || !responseId) {
    return res
      .status(BAD_REQUEST)
      .json({ message: "Required fields are missing" });
  }

  const query = `
        INSERT INTO ValueTable (responseId, formId , userEmail, startTime, termsAccepted)
        VALUES (?, ?, ?, ?, ?)
      `;

  connection.query(
    query,
    [responseId, formId, userEmail, startTime, termsAccepted],
    (err, results) => {
      if (err) {
        console.error("Error submitting form response:", err);
        return res.status(SERVER_ERROR).json({ error: "Server error" });
      }

      res.status(STATUS_OK).json({ message: "Response submitted", responseId });
    }
  );
};

export const editSubmission = (req, res) => {
  const { formId } = req.params;
  const {
    value,
    userEmail,
    endTime,
    duration,
    score,
    status,
    warnings,
  } = req.body;

  if (!formId) {
    return res.status(BAD_REQUEST).json({ message: "formId is required" });
  }

  const query = `
    UPDATE ValueTable
    SET value = ?, endTime = ?, duration = ?, score = ?, status = ?,
    warnings = ? WHERE formId = ? AND userEmail = ?
  `;

  connection.query(
    query,
    [
      JSON.stringify(value),
      endTime || null,
      duration || null,
      score,
      status,
      warnings,
      formId,
      userEmail,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating submission:", err);
        return res.status(SERVER_ERROR).json({ message: "Server error" });
      }

      if (result.affectedRows === 0) {
        return res.status(NOT_FOUND).json({ message: "Submission not found" });
      }

      res.status(STATUS_OK).json({ message: "Submission updated" });
    }
  );
};

export const getCandidateFields = (req, res) => {
  const { formId } = req.params;

  if (!formId) {
    return res.status(BAD_REQUEST).json({ message: "formId is required" });
  }

  connection.query(
    "SELECT status FROM FormTable WHERE formId = ?",
    [formId],
    (formErr, formResults) => {
      if (formErr) {
        console.error("Error checking form status:", formErr);
        return res.status(SERVER_ERROR).json({ error: "Server error" });
      }

      if (formResults.length === 0) {
        return res.status(NOT_FOUND).json({ message: "Form not found" });
      }

      const { status } = formResults[0];
      if (status !== "active") {
        return res.status(FORBIDDEN).json({ message: "Exam not yet started" });
      }

      connection.query(
        "SELECT * FROM FieldTable WHERE formId = ?",
        [formId],
        (fieldErr, fieldResults) => {
          if (fieldErr) {
            console.error("Error fetching fields:", fieldErr);
            return res.status(SERVER_ERROR).json({ error: "Server error" });
          }
          res.status(STATUS_OK).json(fieldResults);
        }
      );
    }
  );
};

export const getFormById = (req, res) => {
  const { formId } = req.params;

  if (!formId) {
    return res.status(BAD_REQUEST).json({ message: "formId is required" });
  }

  connection.query(
    "SELECT * FROM FormTable WHERE formId = ?",
    [formId],
    (err, results) => {
      if (err) {
        console.error("Error fetching form:", err);
        return res.status(SERVER_ERROR).json({ error: "Server error" });
      }

      if (results.length === 0) {
        return res.status(NOT_FOUND).json({ message: "Form not found" });
      }

      res.status(STATUS_OK).json(results[0]);
    }
  );
};

export const updateTimer = (req, res) => {
  const { formId, userEmail } = req.params;
  const { Timer } = req.body;

  if (!formId || !userEmail || !Timer) {
    return res
      .status(BAD_REQUEST)
      .json({ message: "Required fields are missing" });
  }

  const query = `
    UPDATE ValueTable 
    SET Timer = ? 
    WHERE formId = ? AND userEmail = ?
  `;

  connection.query(query, [Timer, formId, userEmail], (err, results) => {
    if (err) {
      console.error("Error updating Timer:", err);
      return res.status(SERVER_ERROR).json({ error: "Server error" });
    }

    if (results.affectedRows === 0) {
      return res
        .status(NOT_FOUND)
        .json({
          message: "No record found with the provided formId and userEmail",
        });
    }

    res.status(STATUS_OK).json({ message: "Timer updated successfully" });
  });
};
