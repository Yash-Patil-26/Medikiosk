import { Router } from 'express';
import multer from 'multer';
import pool from '../config/db.js';
import { extractDocument } from '../providers/ocr/index.js';
import { getSession, sessionIsActive } from '../utils/sessionAccess.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ];

    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/extract', upload.single('file'), async (req, res, next) => {
  const { session_id } = req.body || {};

  if (!req.file) {
    return res.status(400).json({
      error: 'No valid file uploaded (JPG, PNG, PDF only, max 5MB)'
    });
  }

  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    const access = await (async () => {
      const session = await getSession(session_id);

      if (!session) {
        return { session: null, status: 404, error: 'Session not found' };
      }

      if (!sessionIsActive(session)) {
        return {
          session,
          status: 410,
          error: 'Session is no longer active'
        };
      }

      if (Number(session.document_consent) !== 1) {
        return {
          session,
          status: 403,
          error: 'Document processing consent is required'
        };
      }

      return { session, status: 200, error: null };
    })();

    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error });
    }

    // The OCR provider is the existing demo/mock extraction service.
    const extracted = await extractDocument(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Re-check consent and session state before persisting the result.
    let connection;
    let transactionOpen = false;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionOpen = true;

      const session = await getSession(session_id, connection, true);

      if (!session) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(404).json({ error: 'Session not found' });
      }

      if (!sessionIsActive(session)) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(410).json({
          error: 'Session is no longer active'
        });
      }

      if (Number(session.document_consent) !== 1) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(403).json({
          error: 'Document processing consent is required'
        });
      }

      const [inserted] = await connection.query(
        `INSERT INTO document_extractions
         (session_id, doc_key, doc_type, doc_date, provider,
          diagnoses_json, medications_json, labs_json, confidence)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          session_id,
          `doc_${Date.now()}`,
          extracted.docType,
          extracted.date || null,
          extracted.provider,
          JSON.stringify(extracted.diagnoses || []),
          JSON.stringify(extracted.medications || []),
          JSON.stringify(extracted.labs || []),
          extracted.confidence || 0.85
        ]
      );

      await connection.commit();
      transactionOpen = false;

      return res.json({ id: inserted.insertId, ...extracted });
    } catch (err) {
      if (connection && transactionOpen) {
        try {
          await connection.rollback();
        } catch {
          // Preserve the original error.
        }
      }

      throw err;
    } finally {
      connection?.release();
    }
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/verify', async (req, res, next) => {
  const { session_id } = req.body || {};

  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const session = await getSession(session_id, connection, true);

    if (!session) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!sessionIsActive(session)) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(410).json({
        error: 'Session is no longer active'
      });
    }

    if (Number(session.document_consent) !== 1) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(403).json({
        error: 'Document processing consent is required'
      });
    }

    const [rows] = await connection.query(
      `SELECT id
       FROM document_extractions
       WHERE id = ? AND session_id = ?
       FOR UPDATE`,
      [req.params.id, session_id]
    );

    if (!rows[0]) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({
        error: 'Document not found for this session'
      });
    }

    await connection.query(
      `UPDATE document_extractions
       SET verified_by_patient = 1
       WHERE id = ? AND session_id = ?`,
      [req.params.id, session_id]
    );

    await connection.commit();
    transactionOpen = false;

    return res.json({ verified: true });
  } catch (err) {
    if (connection && transactionOpen) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error.
      }
    }

    return next(err);
  } finally {
    connection?.release();
  }
});

export default router;
