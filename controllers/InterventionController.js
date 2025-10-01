const Intervention = require('../models/Intervention');
const pool = require('../config/db');

const interventionController = {
    createIntervention: async (req, res) => {
        try {
            const { package_id, code, name, is_complex, created_by, updated_by } = req.body;
            const intervention = await Intervention.create({
                package_id, code, name, is_complex, created_by, updated_by
            });
            res.status(201).json({ message: 'Intervention created successfully', intervention });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateIntervention: async (req, res) => {
        try {
            const { id } = req.params;
            const { package_id, code, name, is_complex, updated_by } = req.body;
            const updatedIntervention = await Intervention.update(id, { package_id, code, name, is_complex, updated_by });
            if (updatedIntervention) {
                res.json({ message: 'Intervention updated successfully', updatedIntervention });
            } else {
                res.status(404).json({ message: 'Intervention not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getAllInterventions: async (req, res) => {
        try {
            const intervention = await Intervention.getall();
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    searchIntervention: async (req, res) => {
        try {
            const { query } = req.body.query;
            if (!query) {
                return res.status(400).json({ message: 'Search parameter required' })
            }
            const [intervention] = await Intervention.search(query);
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deleteIntervention: async (req, res) => {
        try {
            await Intervention.delete(req.params.id);
            res.json({ message: 'Intervention deleted successfuly' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    getInterventionByPackageId: async (req, res) => {
        try {
            const { package_id } = req.params
            const intervention = await Intervention.getInterventionByPackageId(package_id);
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    getInterventionByCode: async (req, res) => {
        try {
            const { code } = req.params;
            const intervention = await Intervention.getInterventionByCode(code);
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    getInterventionByComplex: async (req, res) => {
        try {
            const { is_complex } = req.params;
            const intervention = await Intervention.getInterventionByComplex(is_complex);
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = interventionController;
