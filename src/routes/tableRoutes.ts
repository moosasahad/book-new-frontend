import express from 'express';
import { getTables, createTable, updateTable, validateTable } from '../controllers/tableController';
import { protect, adminOnly } from '../middlewares/auth';

const router = express.Router();

router.route('/')
  .get(getTables)
  .post(protect, adminOnly, createTable);

router.route('/:id')
  .put(protect, adminOnly, updateTable);

router.get('/validate/:id', validateTable);

export default router;
