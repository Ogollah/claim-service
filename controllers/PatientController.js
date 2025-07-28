const Patient = require('../models/Patient');
const pool = require('../config/db');

const patientController = {
    createPatient: async(req, res) => {
        try{
            const {cd_id, name, gender, birthdate, national_id, email} = req.body;
            const patient = await Patient.create({
                cd_id, name, gender, birthdate, national_id, email
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
    }

}

module.exports = patientController;
