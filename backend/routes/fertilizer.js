const express = require('express');
const router = express.Router();
const FertilizerSchedule = require('../models/FertilizerSchedule');
const { protect } = require('../middleware/auth');

// Calculate recommended fertilization details based on crop and growth stage
const calculateFertilizationMetrics = (crop, growthStage, soilInfo) => {
  let fertilizerType = 'Organic Compost / NPK Balanced (19-19-19)';
  let timingDetail = 'Apply near the root zone once in 3 weeks.';
  let daysToApply = 14;

  const cropLower = crop.toLowerCase();
  const stageLower = growthStage.toLowerCase();

  // Crop-based recommendation logic
  if (cropLower.includes('tomato')) {
    if (stageLower.includes('germination') || stageLower.includes('seedling')) {
      fertilizerType = 'High Phosphorus (e.g., Monoammonium Phosphate 12-61-0)';
      timingDetail = 'Apply weak solution to stimulate root development.';
      daysToApply = 5;
    } else if (stageLower.includes('vegetative')) {
      fertilizerType = 'High Nitrogen NPK (e.g., NPK 19-19-19 or Urea)';
      timingDetail = 'Apply to promote leaf and stem growth. Keep soil moist.';
      daysToApply = 10;
    } else if (stageLower.includes('flowering') || stageLower.includes('fruiting')) {
      fertilizerType = 'High Potassium & Calcium (e.g., Calcium Nitrate & NPK 13-0-45)';
      timingDetail = 'Apply weekly to prevent blossom-end rot and improve fruit size.';
      daysToApply = 7;
    }
  } else if (cropLower.includes('wheat') || cropLower.includes('rice') || cropLower.includes('paddy')) {
    if (stageLower.includes('vegetative') || stageLower.includes('tillering')) {
      fertilizerType = 'Urea (Nitrogen) & Single Super Phosphate (SSP)';
      timingDetail = 'Broadcasting application before second watering/flooding.';
      daysToApply = 12;
    } else if (stageLower.includes('flowering') || stageLower.includes('panicle')) {
      fertilizerType = 'Muriate of Potash (MOP)';
      timingDetail = 'Apply to increase grain weight and stem strength.';
      daysToApply = 15;
    }
  } else if (cropLower.includes('cotton')) {
    fertilizerType = 'NPK 20-20-10 & Magnesium Sulphate';
    timingDetail = 'Side dressing during square formation and flowering.';
    daysToApply = 18;
  } else if (cropLower.includes('sugarcane')) {
    fertilizerType = 'Urea, SSP, and MOP (NPK ratio 250:115:115 kg/hectare)';
    timingDetail = 'Apply in 4 split doses: at planting, 60 days, 90 days, and 120 days.';
    daysToApply = 30;
  }

  // Adjust timing based on soil info
  const soilLower = soilInfo.toLowerCase();
  if (soilLower.includes('sandy')) {
    timingDetail += ' (Sandy soil drains nutrients quickly. Apply in split, smaller doses)';
    daysToApply = Math.max(3, daysToApply - 3); // Apply sooner in sandy soil
  }

  const nextApplication = new Date();
  nextApplication.setDate(nextApplication.getDate() + daysToApply);
  nextApplication.setHours(9, 0, 0, 0); // Default to 9 AM

  return {
    fertilizerType,
    timingDetail,
    nextApplication
  };
};

// @route   GET api/fertilizer
// @desc    Get user's fertilizer schedules
router.get('/', protect, async (req, res) => {
  try {
    const schedules = await FertilizerSchedule.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving fertilizer schedules.' });
  }
});

// @route   POST api/fertilizer
// @desc    Create a new fertilizer schedule
router.post('/', protect, async (req, res) => {
  try {
    const { crop, growthStage, soilInfo, plantingDate, fieldSize, remindersEnabled, applicationTime } = req.body;

    if (!crop || !growthStage || !soilInfo || !plantingDate || !fieldSize) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const { fertilizerType, nextApplication } = calculateFertilizationMetrics(crop, growthStage, soilInfo);

    const schedule = await FertilizerSchedule.create({
      userId: req.user._id,
      crop,
      growthStage,
      soilInfo,
      plantingDate,
      fieldSize: parseFloat(fieldSize),
      remindersEnabled: remindersEnabled !== undefined ? remindersEnabled : true,
      fertilizerType,
      nextApplication,
      applicationTime: applicationTime || '08:00'
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating fertilizer schedule:', error);
    res.status(500).json({ message: 'Server error creating schedule.' });
  }
});

// @route   PUT api/fertilizer/:id
// @desc    Update fertilizer schedule or toggle reminders
router.put('/:id', protect, async (req, res) => {
  try {
    const { crop, growthStage, soilInfo, remindersEnabled, fieldSize, applicationTime } = req.body;
    let schedule = await FertilizerSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Fertilizer schedule not found.' });
    }

    // Verify ownership
    if (schedule.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    if (crop) schedule.crop = crop;
    if (growthStage) schedule.growthStage = growthStage;
    if (soilInfo) schedule.soilInfo = soilInfo;
    if (fieldSize) schedule.fieldSize = parseFloat(fieldSize);
    if (remindersEnabled !== undefined) schedule.remindersEnabled = remindersEnabled;
    if (applicationTime) schedule.applicationTime = applicationTime;

    // Recalculate if changed
    if (crop || growthStage || soilInfo) {
      const { fertilizerType, nextApplication } = calculateFertilizationMetrics(
        schedule.crop,
        schedule.growthStage,
        schedule.soilInfo
      );
      schedule.fertilizerType = fertilizerType;
      schedule.nextApplication = nextApplication;
    }

    await schedule.save();
    res.json(schedule);

  } catch (error) {
    console.error('Error updating fertilizer schedule:', error);
    res.status(500).json({ message: 'Server error updating schedule.' });
  }
});

// @route   DELETE api/fertilizer/:id
// @desc    Delete a fertilizer schedule
router.delete('/:id', protect, async (req, res) => {
  try {
    const schedule = await FertilizerSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Fertilizer schedule not found.' });
    }

    // Verify ownership
    if (schedule.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Fertilizer schedule deleted successfully.' });

  } catch (error) {
    console.error('Error deleting fertilizer schedule:', error);
    res.status(500).json({ message: 'Server error deleting schedule.' });
  }
});

module.exports = router;
