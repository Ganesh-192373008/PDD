export const getDiseaseDetails = (crop, disease) => {
  const normalizedDisease = (disease || '').toLowerCase().trim();

  // Primary database of disease details
  const db = {
    'apple scab': {
      scientificName: 'Venturia inaequalis',
      symptoms: [
        'Olive-green to brown velvety spots on leaves',
        'Fruit lesions that turn black and corky',
        'Premature leaf drop'
      ],
      causes: [
        'Fungal spores overwintering on fallen leaves',
        'Spread by spring rains and high humidity'
      ],
      treatment: 'Apply copper-based fungicides during green tip stage. Prune affected branches and rake fallen leaves to prevent overwintering.',
      prevention: 'Plant resistant cultivars, rake and destroy fallen leaves in autumn, prune to open the canopy for airflow.',
      recommendedActions: [
        'Prune out visibly infected parts immediately.',
        'Clear leaf debris around tree base.',
        'Apply protective organic fungicide.'
      ]
    },
    'apple black rot': {
      scientificName: 'Botryosphaeria obtusa',
      symptoms: [
        'Frogeye leaf spots with purple margins',
        'Dark sunken cankers on bark and branches',
        'Black, rotted, mummified fruits hanging on tree'
      ],
      causes: [
        'Fungal pathogen entering tree wounds or cracks',
        'Warm, wet conditions during early fruit sizing'
      ],
      treatment: 'Prune out dead wood, cankers, and mummified fruit. Apply sulfur or captan-based fungicides at regular intervals.',
      prevention: 'Sanitize tools after pruning; remove all mummified fruit; keep trees healthy.',
      recommendedActions: [
        'Prune out and destroy infected branches.',
        'Remove any mummified fruit remaining on the tree.',
        'Apply organic copper-based protectant.'
      ]
    },
    'cedar apple rust': {
      scientificName: 'Gymnosporangium juniperi-virginianae',
      symptoms: [
        'Bright yellow-orange spots on leaves',
        'Tube-like structures on leaf undersides',
        'Fruit spotting and distortion'
      ],
      causes: [
        'Fungal lifecycle requiring both apple trees and eastern red cedars'
      ],
      treatment: 'Remove nearby eastern red cedar trees if possible. Apply immunox or copper fungicides when apple flower buds show pink.',
      prevention: 'Avoid planting red cedars near orchards; use rust-resistant apple varieties.',
      recommendedActions: [
        'Treat with preventive copper spray.',
        'Remove cedar galls from surrounding trees.'
      ]
    },
    'common rust': {
      scientificName: 'Puccinia sorghi',
      symptoms: [
        'Cinnamon-brown pustules on leaf surfaces',
        'Yellowing of surrounding leaf tissue',
        'Dusty brown spores easily rubbed off'
      ],
      causes: [
        'Windborne fungal spores from southern regions',
        'Cool temperatures with high humidity'
      ],
      treatment: 'Apply triazole or strobilurin-based fungicides if infection is severe.',
      prevention: 'Plant rust-resistant corn varieties. Destroy infected residue post-harvest.',
      recommendedActions: [
        'Monitor leaf cover.',
        'Apply organic foliage spray.'
      ]
    },
    'northern leaf blight': {
      scientificName: 'Exserohilum turcicum',
      symptoms: [
        'Long cigar-shaped grayish-green lesions on leaves',
        'Rapid leaf blighting and drying',
        'Reduced grain yield and stalk lodging'
      ],
      causes: [
        'Fungal pathogen overwintering in corn residue',
        'Splashing rain and wind'
      ],
      treatment: 'Apply triazole or strobilurin-based fungicides if disease appears early.',
      prevention: 'Rotate crops, till residue under, and plant resistant varieties.',
      recommendedActions: [
        'Turn corn residue under.',
        'Apply foliage fungicide.'
      ]
    },
    'black rot': {
      scientificName: 'Guignardia bidwellii',
      symptoms: [
        'Reddish-brown leaf spots with dark margins',
        'Shriveled black mummified berries',
        'Small black pustules on fruit and stems'
      ],
      causes: [
        'Fungal spores from overwintered berries',
        'Wet leaves for 24+ hours'
      ],
      treatment: 'Remove mummified berries from vines. Keep vines off the ground. Apply mancozeb or myclobutanil fungicides early in the spring.',
      prevention: 'Prune lower leaves, keep vines off ground, and harvest completely.',
      recommendedActions: [
        'Prune infected foliage.',
        'Apply copper or sulfur-based sprays.'
      ]
    },
    'esca (black measles)': {
      scientificName: 'Phaeomoniella chlamydospora',
      symptoms: [
        'Interveinal stripes on leaves (tiger-stripe)',
        'Dark spots on berry skins',
        'Wood decay and vine decline'
      ],
      causes: [
        'Fungal spores entering pruning wounds'
      ],
      treatment: 'Protect pruning wounds with wound sealants. Retain healthy trunks; remove and burn severely infected vines during winter pruning.',
      prevention: 'Sanitize pruning tools; seal wounds.',
      recommendedActions: [
        'Apply wound sealant to pruning cuts.',
        'Prune and destroy severely infected vines.'
      ]
    },
    'leaf blight': {
      scientificName: 'Isariopsis clavispora',
      symptoms: [
        'Dull red to brown spots on leaves',
        'Premature leaf drying and dropping',
        'Dark brown patches on twigs'
      ],
      causes: [
        'Fungal pathogen spread by rain splashes'
      ],
      treatment: 'Prune lower leaves to improve ventilation. Apply copper hydroxide fungicides at 10-14 day intervals under wet conditions.',
      prevention: 'Perform regular pruning to optimize sun exposure. Mulch around the base.',
      recommendedActions: [
        'Remove bottom leaves.',
        'Spray protective fungicide.'
      ]
    },
    'citrus greening': {
      scientificName: 'Candidatus Liberibacter asiaticus',
      symptoms: [
        'Yellow mottling of leaves',
        'Bitter, lopsided green fruits',
        'Stunted growth and twig dieback'
      ],
      causes: [
        'Bacterium transmitted by the Asian citrus psyllid'
      ],
      treatment: 'Remove and destroy infected trees to prevent spread. Apply horticultural mineral oils or insecticides to control psyllid vector.',
      prevention: 'Use disease-free nursery stock; monitor for psyllids.',
      recommendedActions: [
        'Remove infected branches or trees.',
        'Control psyllids with organic neem oil or insecticides.'
      ]
    },
    'bacterial spot': {
      scientificName: 'Xanthomonas campestris',
      symptoms: [
        'Small dark water-soaked spots on leaves',
        'Spots with yellow halos',
        'Cracked scab-like fruit lesions'
      ],
      causes: [
        'Bacterial pathogen entering through stomata or wounds',
        'Warm, wet, windy weather'
      ],
      treatment: 'Apply copper-based sprays early. Remove crop debris after harvest.',
      prevention: 'Plant resistant seed varieties; avoid overhead watering.',
      recommendedActions: [
        'Remove heavily infected leaves.',
        'Apply copper bactericide weekly during wet periods.'
      ]
    },
    'early blight': {
      scientificName: 'Alternaria solani',
      symptoms: [
        'Concentric ring "target spots" on older leaves',
        'Yellowing halos around spots',
        'Stem lesions and dark leathery spots near stem end of fruit'
      ],
      causes: [
        'Fungal spores surviving in soil and crop debris',
        'Warm temperatures with high dew or wet foliage'
      ],
      treatment: 'Spray copper or chlorothalonil fungicides; mulch around base.',
      prevention: 'Rotate crops yearly; prune lower branches; water at base.',
      recommendedActions: [
        'Remove bottom leaves up to 1 foot high.',
        'Apply mulch to prevent soil splashing.',
        'Spray protective copper fungicide.'
      ]
    },
    'late blight': {
      scientificName: 'Phytophthora infestans',
      symptoms: [
        'Dark water-soaked lesions on leaves',
        'White velvety mold on leaf undersides',
        'Rapid leaf and stem rot, dark spots on fruit'
      ],
      causes: [
        'Water mold spreading rapidly in cool, wet, humid weather'
      ],
      treatment: 'Apply copper hydroxide or mancozeb fungicides immediately; remove infected plants.',
      prevention: 'Plant resistant varieties, space plants widely for airflow, avoid overhead watering.',
      recommendedActions: [
        'Destroy infected plants immediately to prevent spread.',
        'Spray nearby healthy plants with protective copper fungicide.'
      ]
    },
    'leaf mold': {
      scientificName: 'Passalora fulva',
      symptoms: [
        'Pale green or yellow spots on leaf tops',
        'Olive-green velvety mold on leaf undersides',
        'Leaves curl, wither, and drop'
      ],
      causes: [
        'Fungus thriving in greenhouse environments with high humidity'
      ],
      treatment: 'Apply copper fungicides. Increase ventilation and spacing.',
      prevention: 'Reduce humidity, keep leaves dry, grow resistant hybrids.',
      recommendedActions: [
        'Increase spacing between plants.',
        'Water only at the root level.'
      ]
    },
    'septoria leaf spot': {
      scientificName: 'Septoria lycopersici',
      symptoms: [
        'Numerous small circular spots with gray centers',
        'Dark brown borders around spots',
        'Yellowing and leaf drop starting from bottom'
      ],
      causes: [
        'Fungal pathogen splashed from soil to lower leaves'
      ],
      treatment: 'Apply copper-based fungicides. Keep foliage dry.',
      prevention: 'Mulch thoroughly, water at base, practice 3-year crop rotation.',
      recommendedActions: [
        'Pick off and discard infected lower leaves.',
        'Spray copper-based organic fungicide.'
      ]
    },
    'spider mites': {
      scientificName: 'Tetranychidae',
      symptoms: [
        'Fine yellow stippling on leaf tops',
        'Very fine webbing on leaf undersides',
        'Leaves turn bronze and dry out'
      ],
      causes: [
        'Dry, hot, dusty weather promoting rapid mite reproduction'
      ],
      treatment: 'Spray with insecticidal soap, neem oil, or horticultural oils.',
      prevention: 'Keep plants well-watered; overhead watering can wash mites off.',
      recommendedActions: [
        'Hose down plants with strong water spray to dislodge mites.',
        'Spray neem oil thoroughly on leaf undersides.'
      ]
    },
    'target spot': {
      scientificName: 'Corynespora cassiicola',
      symptoms: [
        'Zonate brown spots with clear target rings',
        'Spots do not remain restricted by veins',
        'Pitting or sinking of fruit tissue'
      ],
      causes: [
        'Fungal pathogen favored by warm temperatures and long wet periods'
      ],
      treatment: 'Apply chlorothalonil or copper fungicides.',
      prevention: 'Prune to improve airflow, rotate crops, keep soil mulched.',
      recommendedActions: [
        'Apply preventive fungicide.',
        'Ensure plants are spaced properly.'
      ]
    },
    'yellow leaf curl virus': {
      scientificName: 'Begomovirus',
      symptoms: [
        'Severe cupping and curling of leaves upward',
        'Chlorotic (yellow) leaf margins',
        'Stunted plant growth and flower drop'
      ],
      causes: [
        'Virus transmitted by Silverleaf Whiteflies'
      ],
      treatment: 'No chemical cure for the virus. Control whiteflies with insecticidal soaps or neem oil.',
      prevention: 'Use physical insect nets; plant virus-resistant varieties.',
      recommendedActions: [
        'Pull up and destroy severely infected virus plants.',
        'Spray neem oil to control whitefly populations.'
      ]
    },
    'mosaic virus': {
      scientificName: 'Tobamovirus',
      symptoms: [
        'Mottled light and dark green patterns on leaves',
        'Fern-like leaf distortion (shoestringing)',
        'Stunted growth and bumpy fruit'
      ],
      causes: [
        'Highly contagious virus spread by handling or sap contact'
      ],
      treatment: 'No chemical treatment. Promptly remove and burn infected plants.',
      prevention: 'Wash hands and tools with milk or soap; use certified seed.',
      recommendedActions: [
        'Discard infected plants immediately.',
        'Avoid touching healthy plants after handling infected ones.'
      ]
    },
    'leaf scorch': {
      scientificName: 'Diplocarpon earlianum',
      symptoms: [
        'Dark purplish spots on leaf surfaces',
        'Spots enlarge and merge, leaves look scorched',
        'Drying of leaf borders'
      ],
      causes: [
        'Fungus spreading during wet spring weather'
      ],
      treatment: 'Apply thiophanate-methyl or copper fungicides.',
      prevention: 'Plant in full sun and well-drained soil. Apply straw mulch.',
      recommendedActions: [
        'Rake and destroy dead leaves.',
        'Apply protective copper fungicide.'
      ]
    },
    'powdery mildew': {
      scientificName: 'Podosphaera spp.',
      symptoms: [
        'White powdery spots on leaf tops and stems',
        'Leaves yellow, curl, and dry out',
        'Stunted shoot growth'
      ],
      causes: [
        'Fungus spreading in warm dry days and cool humid nights'
      ],
      treatment: 'Apply sulfur or potassium bicarbonate fungicides.',
      prevention: 'Plant in sunny locations; prune to open the canopy.',
      recommendedActions: [
        'Spray organic neem oil or baking soda solution.',
        'Avoid watering foliage in the evening.'
      ]
    }
  };

  // Find exact or partial match
  let key = Object.keys(db).find(k => normalizedDisease.includes(k) || k.includes(normalizedDisease));
  if (!key) {
    // Default fallback
    return {
      scientificName: 'Pathogen spp.',
      symptoms: [
        'Discoloration or spots on leaf surfaces',
        'Yellowing or chlorosis around affected zones',
        'Wilting or drying of foliage'
      ],
      causes: [
        'Warm humid weather promoting pathogen spore activation',
        'Excess moisture or lack of canopy ventilation'
      ],
      treatment: `Apply general organic protective copper fungicide. Prune infected sections.`,
      prevention: 'Maintain crop rotation, sanitize garden tools, and keep spacing between plants.',
      recommendedActions: [
        'Remove and discard infected leaves.',
        'Spray with protective organic neem oil or copper spray.',
        'Improve ventilation and air circulation.'
      ]
    };
  }

  return db[key];
};
