const Provider = require('../models/Provider');
const pool = require('../config/db');

const providerController = {
    createProvider: async(req, res) => {
        try{
            const {f_id, name, level, slade_code, status} = req.body;
            const provider = await Provider.create({
                f_id, name, level, slade_code, status
            });
            res.status(201).json({message: 'Provider created successfully', provider});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    getAllProviders: async(req, res) => {
        try {
            const patinets = await Provider.getall();
            res.json(patinets);
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    searchProvider: async(req, res) => {
        try {
            const{ query } = req.body.query;
            if (!query) {
                return res.status(400).json({message: 'Search parameter required'})
            }
            const [provider] = await Provider.search(query);
            res.json(provider);
        } catch (error) {
           console.error(error);
           res.status(500).json({message: 'Server error'}); 
        }
    },

    deleteProvider: async(req, res) => {
        try {
            await Provider.delete(req.params.id);
            res.json({message: 'Provider deleted successfuly'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },
    getProviderByFID: async(req, res) => {
        try {
            const { fID } = req.params;
            const providers = await Provider.getProviderByFID(fID);
            res.json(providers);
        } catch (error) {
            console.error('Error fetching provider: ', error);
            
        }
    }
}

module.exports = providerController;