import { Router } from 'express';
import multer from 'multer';
import pool from '../config/db.js';
import { extractDocument } from '../providers/ocr/index.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/extract', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No valid file uploaded (JPG, PNG, PDF only, max 5MB)' });
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    const result = await extractDocument(req.file.buffer, req.file.mimetype, req.file.originalname);

    const [ins] = await pool.query(
      'INSERT INTO document_extractions (session_id, doc_key, doc_type, doc_date, provider, diagnoses_json, medications_json, labs_json, confidence) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        session_id,
        `doc_${Date.now()}`,
        result.docType,
        result.date || null,
        result.provider,
        JSON.stringify(result.diagnoses || []),
        JSON.stringify(result.medications || []),
        JSON.stringify(result.labs || []),
        result.confidence || 0.85
      ]
    );

    res.json({ id: ins.insertId, ...result });
  } catch (err) { next(err); }
});

router.post('/:id/verify', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'UPDATE document_extractions SET verified_by_patient = 1 WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ verified: true });
  } catch (err) { next(err); }
});

export default router;
