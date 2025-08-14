// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const claimRoutes = require('./routes/claimRoutes');
const PatientRoutes = require('./routes/PatientRoutes');
const PractitionerRoutes = require('./routes/PractitionerRoutes');
const ProviderRoutes = require('./routes/ProviderRoutes');
const PackageRoutes = require('./routes/PackageRoutes');
const InterventionRoutes = require('./routes/InterventionRoutes');
const TestCaseRoutes = require('./routes/TestCaseRoutes');
const ResultRoutes = require('./routes/ResultRoutes');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/claims', claimRoutes);

app.use('/api/patients', PatientRoutes);
app.use('/api/practitioners', PractitionerRoutes);
app.use('/api/providers', ProviderRoutes);
app.use('/api/packages', PackageRoutes);
app.use('/api/interventions', InterventionRoutes);
app.use('/api/test-cases', TestCaseRoutes);
app.use('/api/results', ResultRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Database initialization
const initializeDatabase = require('./config/initDb');
initializeDatabase().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});