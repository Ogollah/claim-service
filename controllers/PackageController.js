const Package = require('../models/Package');
const pool = require('../config/db');

const packageController = {
    createPackage: async (req, res) => {
        try {
            const { code, name } = req.body;
            const shaPackage = await Package.create({
                code, name
            });
            res.status(201).json({ message: 'Package created successfully', shaPackage });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getAllPackages: async (req, res) => {
        try {
            const shaPackage = await Package.getall();
            res.json(shaPackage);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    searchPackage: async (req, res) => {
        try {
            const { query } = req.body.query;
            if (!query) {
                return res.status(400).json({ message: 'Search parameter required' })
            }
            const [shaPackage] = await Package.search(query);
            res.json(shaPackage);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deletePackage: async (req, res) => {
        try {
            await Package.delete(req.params.id);
            res.json({ message: 'Package deleted successfuly' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    getPackageByPreauthFlag: async (req, res) => {
        try {
            const { is_preauth } = req.params;
            const packages = await Package.getPackageByPreauthFlag(1);
            res.json(packages);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

}

module.exports = packageController;
