const TestCase = require('../models/TestCase');
const pool = require('../config/db');

const testCaseController = {
    createTestCase: async(req, res) => {
        try{
            const {intervention_id, name, description, code, test_config} = req.body;
            const testCase = await TestCase.create({
               intervention_id, name, description, code, test_config
            });
            res.status(201).json({message: 'Test case created successfully', testCase});
        } catch (error) {
            console.error(error);
            res.json({message: 'Server error', error});
        }
    },

    getAllTestCases: async(req, res) => {
        try {
            const testCase = await TestCase.getall();
            res.json(testCase);
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    searchTestCase: async(req, res) => {
        try {
            const{ query } = req.body.query;
            if (!query) {
                return res.status(400).json({message: 'Search parameter required'})
            }
            const [testcase] = await TestCase.search(query);
            res.json(testcase);
        } catch (error) {
           console.error(error);
           res.status(500).json({message: 'Server error'}); 
        }
    },

    deleteTestCase: async(req, res) => {
        
        try {
            await TestCase.delete(req.params.id);
            res.json({message: 'Test case deleted successfuly'});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    getTestCaseByCode: async(req, res) => {
        try {
            const { code } = req.params;
            const resp = await TestCase.getTestCaseByCode(code);
            res.json(resp)
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
        }
    },

    updateTestConfig: async (req, res) => {
    try {
        const id = req.params.id;
        const testCase = req.body?.result_status?.test_config;

        if (!id || !testCase) {
        return res.status(400).json({ error: 'Missing test case ID or test_config data.' });
        }

        const resp = await TestCase.updateTestConfig(id, testCase);

        return res.status(200).json(resp);
    } catch (error) {
        console.error('Error updating test config:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
    }


}

module.exports = testCaseController;
