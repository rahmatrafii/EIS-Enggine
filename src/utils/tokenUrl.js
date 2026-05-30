import jwt from 'jsonwebtoken';

export const generateRetentionToken = (userId, sessionId, quizType) => {
  return jwt.sign(
    { userId, sessionId, quizType },
    process.env.RETENTION_TOKEN_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyRetentionToken = (token) => {
  try {
    return jwt.verify(token, process.env.RETENTION_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};
