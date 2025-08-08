const Intervention = require('../models/Intervention');
const pool = require('../config/db');

const interventionController = {
    createIntervention: async(req, res) => {
        try{
            const {package_id, code, name} = req.body;
            const intervention = await Intervention.create({
                package_id,code, name
            });
            res.status(201).json({message: 'Intervention created successfully', intervention});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    getAllInterventions: async(req, res) => {
        try {
            const intervention = await Intervention.getall();
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    searchIntervention: async(req, res) => {
        try {
            const{ query } = req.body.query;
            if (!query) {
                return res.status(400).json({message: 'Search parameter required'})
            }
            const [intervention] = await Intervention.search(query);
            res.json(intervention);
        } catch (error) {
           console.error(error);
           res.status(500).json({message: 'Server error'}); 
        }
    },

    deleteIntervention: async(req, res) => {
        try {
            await Intervention.delete(req.params.id);
            res.json({message: 'Intervention deleted successfuly'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },
    getInterventionByPackageId: async(req, res) => {
        try {
            const { package_id } = req.params
            const intervention = await Intervention.getInterventionByPackageId(package_id);
            res.json(intervention);
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    }
}

module.exports = interventionController;
