const Patient = require('../models/Patient');
const pool = require('../config/db');

const patientController = {
    createPatient: async(req, res) => {
        try{
            const {cr_id, name, gender, birthdate, national_id, email, system_value} = req.body;
            const patient = await Patient.create({
                cr_id, name, gender, birthdate, national_id, email, system_value
            });
            res.status(201).json({message: 'Patient created successfully', patient});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    getAllPatients: async(req, res) => {
        try {
            const patinets = await Patient.getall();
            res.json(patinets);
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    searchPatient: async(req, res) => {
        try {
            const{ query } = req.params.query;
            if (!query) {
                return res.status(400).json({message: 'Search parameter required'})
            }
            const [patient] = await Patient.search(query);
            res.json(patient);
        } catch (error) {
           console.error(error);
           res.status(500).json({message: 'Server error'}); 
        }
    },

    deletePatient: async(req, res) => {
        try {
            await Patient.delete(req.params.id);
            res.json({message: 'Patient deleted successfuly'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    getPatientByCrID: async (req, res) => {
        try {
            const { cr_id } = req.params;
            console.log('this is cr id', cr_id);

            const patient = await Patient.getByCrID(cr_id);
            res.json(patient);
        } catch (error) {
            console.error('Error getting patient', error);
            res.status(500).json({ message: 'Server error' });
        }
    }


}

module.exports = patientController;
