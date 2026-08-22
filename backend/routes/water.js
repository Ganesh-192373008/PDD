const express = require('express');
const router = express.Router();
const WaterSchedule = require('../models/WaterSchedule');
const { protect } = require('../middleware/auth');

// Calculate recommended watering intervals and next watering date
const calculateWateringMetrics = (crop, soilType, fieldSize) => {
  let intervalDays = 3; // default
  let litersPerAcrePerDay = 5000; // default liters

  // Crop-based logic
  const cropLower = crop.toLowerCase();
  if (cropLower.includes('rice') || cropLower.includes('paddy')) {
    intervalDays = 1; // Needs daily flooding
    litersPerAcrePerDay = 15000;
  } else if (cropLower.includes('cotton')) {
    intervalDays = 6;
    litersPerAcrePerDay = 4000;
  } else if (cropLower.includes('wheat')) {
    intervalDays = 5;
    litersPerAcrePerDay = 3500;
  } else if (cropLower.includes('tomato')) {
    intervalDays = 2;
    litersPerAcrePerDay = 6000;
  } else if (cropLower.includes('sugarcane')) {
    intervalDays = 7;
    litersPerAcrePerDay = 8000;
  } else if (cropLower.includes('maize') || cropLower.includes('corn')) {
    intervalDays = 4;
    litersPerAcrePerDay = 4500;
  }

  // Soil-type adjustment
  const soilLower = soilType.toLowerCase();
  if (soilLower.includes('sandy')) {
    intervalDays = Math.max(1, intervalDays - 1); // Drains quickly, water more often
    litersPerAcrePerDay *= 1.2;
  } else if (soilLower.includes('clay')) {
    intervalDays += 2; // Retains water, water less often
    litersPerAcrePerDay *= 0.8;
  } else if (soilLower.includes('black')) {
    intervalDays += 1; // Good water retention
  }

  const nextWatering = new Date();
  nextWatering.setDate(nextWatering.getDate() + intervalDays);
  nextWatering.setHours(8, 0, 0, 0); // Default to 8 AM

  return {
    frequency: `Every ${intervalDays} days`,
    waterEstimate: Math.round(litersPerAcrePerDay * fieldSize),
    nextWatering,
  };
};

// @route   GET api/water
// @desc    Get user's watering schedules
router.get('/', protect, async (req, res) => {
  try {
    const schedules = await WaterSchedule.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving watering schedules.' });
  }
});

// @route   POST api/water
// @desc    Create a new watering schedule
router.post('/', protect, async (req, res) => {
  try {
    const { crop, fieldSize, soilType, plantingDate, irrigationMethod, remindersEnabled } = req.body;

    if (!crop || !fieldSize || !soilType || !plantingDate || !irrigationMethod) {
      return res.status(400).json({ message: 'All inputs are required.' });
    }

    const { nextWatering } = calculateWateringMetrics(crop, soilType, parseFloat(fieldSize));

    const schedule = await WaterSchedule.create({
      userId: req.user._id,
      crop,
      fieldSize: parseFloat(fieldSize),
      soilType,
      plantingDate,
      irrigationMethod,
      remindersEnabled: remindersEnabled !== undefined ? remindersEnabled : true,
      nextWatering
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating watering schedule:', error);
    res.status(500).json({ message: 'Server error creating schedule.' });
  }
});

// @route   PUT api/water/:id
// @desc    Update/edit schedule or toggle reminders
router.put('/:id', protect, async (req, res) => {
  try {
    const { crop, fieldSize, soilType, irrigationMethod, remindersEnabled } = req.body;
    let schedule = await WaterSchedule.findById(req.id || req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Watering schedule not found.' });
    }

    // Verify ownership
    if (schedule.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    if (crop) schedule.crop = crop;
    if (fieldSize) schedule.fieldSize = parseFloat(fieldSize);
    if (soilType) schedule.soilType = soilType;
    if (irrigationMethod) schedule.irrigationMethod = irrigationMethod;
    if (remindersEnabled !== undefined) schedule.remindersEnabled = remindersEnabled;

    // Recalculate metrics if crop/soil/size changes
    if (crop || soilType || fieldSize) {
      const { nextWatering } = calculateWateringMetrics(schedule.crop, schedule.soilType, schedule.fieldSize);
      schedule.nextWatering = nextWatering;
    }

    await schedule.save();
    res.json(schedule);

  } catch (error) {
    console.error('Error updating watering schedule:', error);
    res.status(500).json({ message: 'Server error updating schedule.' });
  }
});

// @route   DELETE api/water/:id
// @desc    Delete a watering schedule
router.delete('/:id', protect, async (req, res) => {
  try {
    const schedule = await WaterSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Watering schedule not found.' });
    }

    // Verify ownership
    if (schedule.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    await schedule.deleteOne();
    res.json({ message: 'Watering schedule deleted successfully.' });

  } catch (error) {
    console.error('Error deleting watering schedule:', error);
    res.status(500).json({ message: 'Server error deleting schedule.' });
  }
});

module.exports = router;
