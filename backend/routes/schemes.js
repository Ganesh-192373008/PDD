const express = require('express');
const router = express.Router();
const SchemeState = require('../models/SchemeState');
const { protect } = require('../middleware/auth');

// Seeded list of real Indian Government Agricultural Schemes
const schemesData = [
  {
    id: 'sch-pm-kisan',
    name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    description: 'Income support of ₹6,000 per year in three equal installments to all landholding farmer families.',
    eligibility: 'All landholding farmer families across the country (subject to certain exclusion criteria like high-income individuals).',
    benefits: 'Direct cash transfer of ₹6,000 per annum into the bank account of the beneficiary.',
    requiredDocuments: 'Aadhaar Card, Land Holding Documents, Bank Account Details, Mobile Number.',
    deadline: 'Ongoing / No fixed deadline',
    region: 'National',
    officialLink: 'https://pmkisan.gov.in/'
  },
  {
    id: 'sch-pmfby',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    description: 'Government sponsored crop insurance scheme that integrates multiple stakeholders on a single platform to mitigate risk on crops.',
    eligibility: 'All farmers growing notified crops in notified areas including sharecroppers and tenant farmers.',
    benefits: 'Financial support to farmers suffering crop loss/damage arising out of natural calamities, pests & diseases.',
    requiredDocuments: 'Land Records (Khasra/Khatauni), Sowing Certificate, Bank Passbook, Aadhaar Card, ID Proof.',
    deadline: 'Varies by season (Kharif / Rabi crop deadlines apply)',
    region: 'National',
    officialLink: 'https://pmfby.gov.in/'
  },
  {
    id: 'sch-shc',
    name: 'Soil Health Card Scheme',
    description: 'Provides farmers with Soil Health Cards showing nutrient status of their soil and recommendations on dosage of nutrients.',
    eligibility: 'All farmers in the country owning agricultural land.',
    benefits: 'Get Soil Health Card detailing 12 parameters (N, P, K, S, micronutrients, pH, EC, OC) and custom fertilizer schedules.',
    requiredDocuments: 'Land ownership record, Soil sample collected from field.',
    deadline: 'Periodic cycle (every 2 years)',
    region: 'National',
    officialLink: 'https://www.soilhealth.dac.gov.in/'
  },
  {
    id: 'sch-pmksy',
    name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) - Per Drop More Crop',
    description: 'Focuses on enhancing water use efficiency at farm level through micro-irrigation technologies like Drip & Sprinkler systems.',
    eligibility: 'Small, marginal, and cooperative farming groups with access to water sources.',
    benefits: 'Up to 45% to 55% financial subsidy on installing drip or sprinkler irrigation systems.',
    requiredDocuments: 'Aadhaar Card, Land Registration Papers, Electricity Bill/Water Source Proof, Bank Passbook.',
    deadline: 'State-dependent registration calendar',
    region: 'National',
    officialLink: 'https://pmksy.gov.in/'
  },
  {
    id: 'sch-kcc',
    name: 'Kisan Credit Card (KCC) Scheme',
    description: 'Provides farmers with access to timely credit for cultivation, crop protection, and maintenance of agricultural assets.',
    eligibility: 'All farmers - individuals/joint borrowers, owner cultivators, tenant farmers, and sharecroppers.',
    benefits: 'Flexible credit limit up to ₹3 Lakhs at very low interest rates (around 4% after interest subvention). Includes accidental insurance.',
    requiredDocuments: 'Filled application form, Land records, Identity proof, Address proof, Bank statement.',
    deadline: 'Ongoing',
    region: 'National',
    officialLink: 'https://www.rbi.org.in/'
  }
];

// @route   GET api/schemes
// @desc    Get all government schemes
router.get('/', (req, res) => {
  res.json(schemesData);
});

// @route   GET api/schemes/user-states
// @desc    Get the current user's scheme tracking status
router.get('/user-states', protect, async (req, res) => {
  try {
    const states = await SchemeState.find({ userId: req.user._id });
    res.json(states);
  } catch (error) {
    console.error('Error fetching scheme states:', error);
    res.status(500).json({ message: 'Error retrieving scheme applications.' });
  }
});

// @route   POST api/schemes/update-state
// @desc    Track status of a government scheme (Not Applied, Interested, Applied, Completed)
router.post('/update-state', protect, async (req, res) => {
  try {
    const { schemeId, status } = req.body;

    if (!schemeId || !status) {
      return res.status(400).json({ message: 'Scheme ID and status are required.' });
    }

    if (!['Not Applied', 'Interested', 'Applied', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    // Check if valid scheme ID
    const schemeExists = schemesData.some(s => s.id === schemeId);
    if (!schemeExists) {
      return res.status(400).json({ message: 'Scheme ID does not exist.' });
    }

    // Upsert the status
    const updatedState = await SchemeState.findOneAndUpdate(
      { userId: req.user._id, schemeId },
      { status, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json(updatedState);
  } catch (error) {
    console.error('Error updating scheme state:', error);
    res.status(500).json({ message: 'Server error updating scheme application state.' });
  }
});

module.exports = router;
