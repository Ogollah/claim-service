const Intervention = require('../models/Intervention');
const pool = require('../config/db');

const nterventionController = {
    createIntervention: async(req, res) => {
        try{
            const {code, name} = req.body;
            const intervention = await Intervention.create({
                code, name
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

    serchIntervention: async(req, res) => {
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
    }

}