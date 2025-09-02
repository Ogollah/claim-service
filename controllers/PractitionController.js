const Practitioner = require('../models/Practitioner');
const pool = require('../config/db');

const practitionerController = {
    createPractitioner: async (req, res) => {
        try {
            const { pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number } = req.body;
            const practitioner = await Practitioner.create({
                pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number
            });
            res.status(201).json({ message: 'Practitioner created successfully', practitioner });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getAllPractitioners: async (req, res) => {
        try {
            const patinets = await Practitioner.getall();
            res.json(patinets);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    searchPractitioner: async (req, res) => {
        try {
            const { query } = req.body.query;
            if (!query) {
                return res.status(400).json({ message: 'Search parameter required' })
            }
            const [practitioner] = await Practitioner.search(query);
            res.json(practitioner);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deletePractitioner: async (req, res) => {
        try {
            await Practitioner.delete(req.params.id);
            res.json({ message: 'Practitioner deleted successfuly' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    getPractitionerByPuID: async (req, res) => {
        try {
            const { pu_id } = req.params;
            const practitioner = await Practitioner.getPractitionerByPuID(pu_id);
            res.json(practitioner);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });

        }
    },
    updatePractitioner: async (req, res) => {
        try {
            const { id } = req.params;
            const practitionerData = req.body;
            const updatedRows = await Practitioner.update(id, practitionerData);
            if (updatedRows > 0) {
                res.json({ message: 'Practitioner updated successfully' });
            } else {
                res.status(404).json({ message: 'Practitioner not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = practitionerController;