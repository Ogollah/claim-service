const ResultModel = require('../models/Result');

const ResultController = {
  async getAll(req, res) {
    const results = await ResultModel.getAllResults();
    res.json(results);
  },

  async getOne(req, res) {
    const id = req.params.id;
    const result = await ResultModel.getResultById(id);
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json(result);
  },

  async create(req, res) {
    const { testcase_id, result_status, claim_id, response_id, status_code, message, detail } = req.body;
    if (result_status === undefined || !testcase_id)
      return res.status(400).json({ error: 'Missing fields' });

    const newResult = await ResultModel.createResult(testcase_id, result_status, claim_id, response_id, status_code, message, detail);
    res.status(201).json(newResult);
  },

  async update(req, res) {
    const id = req.params.id;
    const { result_status } = req.body;
    if (result_status === undefined)
      return res.status(400).json({ error: 'Missing result_status' });

    const existing = await ResultModel.getResultById(id);
    if (!existing) return res.status(404).json({ error: 'Result not found' });

    const updated = await ResultModel.updateResult(id, result_status);
    res.json(updated);
  },

  async remove(req, res) {
    const id = req.params.id;
    const existing = await ResultModel.getResultById(id);
    if (!existing) return res.status(404).json({ error: 'Result not found' });

    await ResultModel.deleteResult(id);
    res.json({ message: 'Result deleted' });
  }
};

module.exports = ResultController;
