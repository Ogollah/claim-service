const TestCase = require('../models/TestCase');
const pool = require('../config/db');

const TestCaseController = {
    createTestCase: async(req, res) => {
        try{
            const {name, description, test_config} = req.body;
            const testCase = await TestCase.create({
                name, description, test_config
            });
            res.status(201).json({message: 'Test case created successfully', testCase});
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Server error'});
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

    serchTestCase: async(req, res) => {
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
    }

}