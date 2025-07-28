const Package = require('../models/Package');
const pool = require('../config/db');

const packageController = {
    createPackage: async(req, res) => {
        try{
            const {code, name} = req.body;
            const package = await Package.create({
                code, name
            });
            res.status(201).json({message: 'Package created successfully', package});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    getAllPackages: async(req, res) => {
        try {
            const package = await Package.getall();
            res.json(package);
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    serchPackage: async(req, res) => {
        try {
            const{ query } = req.body.query;
            if (!query) {
                return res.status(400).json({message: 'Search parameter required'})
            }
            const [package] = await Package.search(query);
            res.json(package);
        } catch (error) {
           console.error(error);
           res.status(500).json({message: 'Server error'}); 
        }
    },

    deletePackage: async(req, res) => {
        try {
            await Package.delete(req.params.id);
            res.json({message: 'Package deleted successfuly'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    }

}