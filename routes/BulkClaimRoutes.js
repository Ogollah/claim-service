const express = require('express');
const multer = require('multer');
const path = require('path');
const claimController = require('../controllers/bulk/claimController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bulk-claims-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 50MB limit
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

// Bulk claim routes
router.post('/bulk/upload', upload.single('file'), claimController.uploadBulkClaims);
router.get('/bulk/status/:jobId', claimController.getBulkJobStatus);
router.get('/bulk/results/:jobId', claimController.downloadResultFile);
router.get('/bulk/jobs', claimController.listBulkJobs);

// router.post('/bulk/submit', claimController.submitClaim);
// router.get('/response/:claim_id', claimController.getClaimResponse);

module.exports = router;