import sys
import os
import json
import numpy as np
from PIL import Image

# Ensure stdout uses UTF-8 to prevent encoding errors on Windows
sys.stdout.reconfigure(encoding='utf-8')

# 38 PlantVillage Classes mapped to detailed recommendations
CLASS_MAPPING = {
    0: {
        "crop": "Apple",
        "disease": "Apple Scab",
        "severity": "Moderate",
        "recommendation": "Apply copper-based fungicides during green tip stage. Prune affected branches and rake fallen leaves to prevent overwintering of spores."
    },
    1: {
        "crop": "Apple",
        "disease": "Black Rot",
        "severity": "Severe",
        "recommendation": "Prune out dead wood, cankers, and mummified fruit. Apply sulfur or captan-based fungicides at regular intervals."
    },
    2: {
        "crop": "Apple",
        "disease": "Cedar Apple Rust",
        "severity": "Moderate",
        "recommendation": "Remove nearby eastern red cedar trees if possible. Apply immunox or copper fungicides when apple flower buds show pink."
    },
    3: {
        "crop": "Apple",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Maintain regular watering and organic mulching. Inspect leaves bi-weekly for any visual symptoms."
    },
    4: {
        "crop": "Blueberry",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Maintain acidic soil pH (4.5-5.2) and feed with organic compost. Watch for birds and pests."
    },
    5: {
        "crop": "Cherry",
        "disease": "Powdery Mildew",
        "severity": "Moderate",
        "recommendation": "Prune trees to open the canopy for better air circulation. Apply sulfur or potassium bicarbonate fungicides at first sign of disease."
    },
    6: {
        "crop": "Cherry",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Ensure proper drainage and sun exposure. Apply general organic fertilizer once in spring."
    },
    7: {
        "crop": "Corn (Maize)",
        "disease": "Cercospora Leaf Spot (Gray Leaf Spot)",
        "severity": "Severe",
        "recommendation": "Practice crop rotation for at least 1 year. Apply triazole or strobilurin-based fungicides if disease appears early in the season."
    },
    8: {
        "crop": "Corn (Maize)",
        "disease": "Common Rust",
        "severity": "Moderate",
        "recommendation": "Plant rust-resistant corn varieties. Destroy infected residue post-harvest. Use standard fungicides if infection exceeds 10%."
    },
    9: {
        "crop": "Corn (Maize)",
        "disease": "Northern Leaf Blight",
        "severity": "Severe",
        "recommendation": "Chop and bury corn debris to promote decomposition. Apply preventive fungicides during early silking if weather is warm and humid."
    },
    10: {
        "crop": "Corn (Maize)",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Ensure balanced nitrogen application. Keep fields clear of weeds."
    },
    11: {
        "crop": "Grape",
        "disease": "Black Rot",
        "severity": "Severe",
        "recommendation": "Remove mummified berries from vines. Keep vines off the ground. Apply mancozeb or myclobutanil fungicides early in the spring."
    },
    12: {
        "crop": "Grape",
        "disease": "Esca (Black Measles)",
        "severity": "Severe",
        "recommendation": "Protect pruning wounds with wound sealants. Retain healthy trunks; remove and burn severely infected vines during winter pruning."
    },
    13: {
        "crop": "Grape",
        "disease": "Leaf Blight (Isariopsis Leaf Spot)",
        "severity": "Moderate",
        "recommendation": "Prune lower leaves to improve ventilation. Apply copper hydroxide fungicides at 10-14 day intervals under wet conditions."
    },
    14: {
        "crop": "Grape",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Perform regular pruning to optimize sun exposure. Mulch around the base to keep soil moisture uniform."
    },
    15: {
        "crop": "Orange",
        "disease": "Huanglongbing (Citrus Greening)",
        "severity": "Critical",
        "recommendation": "Control the Asian citrus psyllid vector using horticultural mineral oils or insecticides. Remove and destroy infected trees to prevent spread."
    },
    16: {
        "crop": "Peach",
        "disease": "Bacterial Spot",
        "severity": "Severe",
        "recommendation": "Plant resistant cultivars. Apply copper sprays during late dormant season, and use oxytetracycline during the growing season."
    },
    17: {
        "crop": "Peach",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Keep trees pruned to a bowl shape to optimize light penetration. Thin excess fruit in early summer."
    },
    18: {
        "crop": "Pepper (Bell)",
        "disease": "Bacterial Spot",
        "severity": "Severe",
        "recommendation": "Use certified disease-free seeds. Avoid overhead irrigation to minimize leaf wetness. Apply copper-mancozeb fungicide sprays."
    },
    19: {
        "crop": "Pepper (Bell)",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Maintain warm, well-drained soil. Stake plants to keep fruit clean and off the ground."
    },
    20: {
        "crop": "Potato",
        "disease": "Early Blight",
        "severity": "Moderate",
        "recommendation": "Practice crop rotation. Maintain high soil fertility (especially Nitrogen). Spray chlorothalonil or copper fungicides upon detecting first spots."
    },
    21: {
        "crop": "Potato",
        "disease": "Late Blight",
        "severity": "Critical",
        "recommendation": "Plant certified seed tubers. Apply protectant fungicides (mancozeb, chlorothalonil) weekly during wet weather. Destroy volunteer potato plants."
    },
    22: {
        "crop": "Potato",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Hill soil around potato stems to protect developing tubers. Irrigate early in the morning so foliage dries quickly."
    },
    23: {
        "crop": "Raspberry",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Provide sturdy trellis support. Prune out floricanes (fruiting canes) immediately after harvest to maintain vigor."
    },
    24: {
        "crop": "Soybean",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Maintain proper plant spacing. Monitor for aphids and leaf-eating beetles during pod development."
    },
    25: {
        "crop": "Squash",
        "disease": "Powdery Mildew",
        "severity": "Moderate",
        "recommendation": "Space plants generously to promote air flow. Apply potassium bicarbonate or neem oil sprays. Clean tools after pruning."
    },
    26: {
        "crop": "Strawberry",
        "disease": "Leaf Scorch",
        "severity": "Moderate",
        "recommendation": "Plant in full sun and well-drained soil. Apply straw mulch to keep berries off wet dirt. Apply thiophanate-methyl fungicides if severe."
    },
    27: {
        "crop": "Strawberry",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Remove runner plants to focus energy on berry production. Renovate strawberry beds annually after harvest."
    },
    28: {
        "crop": "Tomato",
        "disease": "Bacterial Spot",
        "severity": "Severe",
        "recommendation": "Remove infected leaves immediately. Avoid overhead watering. Apply copper-based bactericides combined with mancozeb weekly."
    },
    29: {
        "crop": "Tomato",
        "disease": "Early Blight",
        "severity": "Moderate",
        "recommendation": "Prune lower leaves to prevent soil splash. Mulch around the plant. Apply copper fungicides or chlorothalonil every 7-10 days."
    },
    30: {
        "crop": "Tomato",
        "disease": "Late Blight",
        "severity": "Critical",
        "recommendation": "Monitor weather for cool, wet conditions. Remove and destroy infected plants entirely. Apply preventative chlorothalonil or copper spray."
    },
    31: {
        "crop": "Tomato",
        "disease": "Leaf Mold",
        "severity": "Moderate",
        "recommendation": "Ensure greenhouse humidity is below 85% by increasing ventilation. Prune leaves below the lowest fruit cluster. Spray copper fungicide."
    },
    32: {
        "crop": "Tomato",
        "disease": "Septoria Leaf Spot",
        "severity": "Moderate",
        "recommendation": "Avoid working in the tomato patch when leaves are wet. Control nightshade weeds near the crop. Spray with chlorothalonil or mancozeb."
    },
    33: {
        "crop": "Tomato",
        "disease": "Spider Mites (Two-Spotted)",
        "severity": "Severe",
        "recommendation": "Spray leaves with insecticidal soap, neem oil, or a strong stream of water to dislodge mites. Release predatory mites if grown in greenhouse."
    },
    34: {
        "crop": "Tomato",
        "disease": "Target Spot",
        "severity": "Moderate",
        "recommendation": "Improve air flow by staking and pruning suckers. Apply chlorothalonil, mancozeb, or copper-based fungicides at first symptom."
    },
    35: {
        "crop": "Tomato",
        "disease": "Yellow Leaf Curl Virus",
        "severity": "Critical",
        "recommendation": "Control the whitefly vectors using yellow sticky cards and imidacloprid or insecticidal soaps. Pull up and bag infected plants."
    },
    36: {
        "crop": "Tomato",
        "disease": "Tomato Mosaic Virus",
        "severity": "Critical",
        "recommendation": "No chemical treatment available. Destroy infected plants immediately. Disinfect tools in a 10% bleach solution. Wash hands after handling."
    },
    37: {
        "crop": "Tomato",
        "disease": "Healthy",
        "severity": "None",
        "recommendation": "Maintain uniform soil moisture. Apply calcium-rich fertilizer (like bone meal) to prevent blossom-end rot."
    }
}

def verify_is_plant_or_leaf(img):
    """
    Botanical leaf verification:
    Analyzes RGB & HSV color channels to ensure the uploaded photo contains genuine plant foliage/leaf textures,
    rejecting non-plant objects (e.g. humans, furniture, electronics, solid screens, sky, cars).
    """
    try:
        # Resize for fast heuristic analysis
        small_img = img.resize((128, 128)).convert('RGB')
        hsv_img = small_img.convert('HSV')
        
        rgb_arr = np.array(small_img, dtype=np.float32)
        hsv_arr = np.array(hsv_img, dtype=np.float32)
        
        r, g, b = rgb_arr[:, :, 0], rgb_arr[:, :, 1], rgb_arr[:, :, 2]
        h, s, v = hsv_arr[:, :, 0], hsv_arr[:, :, 1], hsv_arr[:, :, 2]
        
        # In PIL HSV: H is 0-255 (where 255 = 360 degrees)
        # Green foliage: Hue approx 40° to 160° -> ~28 to 115 in 0-255
        # Yellowish / Brown / Diseased leaf: Hue approx 20° to 45° -> ~14 to 32
        green_mask = (h >= 25) & (h <= 120) & (s >= 35) & (v >= 30)
        yellow_brown_mask = (h >= 10) & (h < 25) & (s >= 40) & (v >= 30) & (g >= b)
        
        # Chlorophyll ratio: Green channel dominance check
        chlorophyll_ratio = (g > (r * 0.85)) & (g > (b * 0.85)) & (g > 30)
        
        plant_pixels = green_mask | yellow_brown_mask | chlorophyll_ratio
        plant_coverage = np.sum(plant_pixels) / (128 * 128)
        
        # Check color variance to eliminate monochromatic blank backgrounds
        color_std = np.std(rgb_arr)
        
        if color_std < 15.0:
            # Blank/solid screen or wall
            return False, plant_coverage
            
        # If plant foliage is less than 10%, it's not a crop leaf
        if plant_coverage < 0.10:
            return False, plant_coverage
            
        return True, plant_coverage
    except Exception:
        # Fallback permissive if heuristic throws
        return True, 0.5

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image file not found: {image_path}"}))
        sys.exit(1)

    try:
        img = Image.open(image_path)
    except Exception as e:
        print(json.dumps({"error": f"Invalid image file: {str(e)}"}))
        sys.exit(1)

    # 1. Botanical Leaf Verification
    is_plant, coverage = verify_is_plant_or_leaf(img)
    if not is_plant:
        output = {
            "isPlant": False,
            "confidenceTooLow": True,
            "error": "No plant leaf detected in the captured image. Please take a clear close-up photo of a crop or plant leaf.",
            "plantCoverage": float(round(coverage, 3))
        }
        print(json.dumps(output))
        sys.exit(0)

    model_path = os.path.join(os.path.dirname(__file__), 'models', 'AgroAssist_PlantVillage_38_Model.keras')
    
    if not os.path.exists(model_path):
        import random
        base_name = os.path.basename(image_path).lower()
        matched_classes = []
        
        for class_idx, mapping in CLASS_MAPPING.items():
            crop_name = mapping["crop"].lower()
            if crop_name in base_name or (crop_name == "corn (maize)" and ("corn" in base_name or "maize" in base_name)):
                matched_classes.append(class_idx)
                
        if not matched_classes:
            matched_classes = list(CLASS_MAPPING.keys())
            
        selected_idx = random.choice(matched_classes)
        mapping = CLASS_MAPPING[selected_idx]
        confidence = float(random.uniform(0.82, 0.98))
        
        output = {
            "isPlant": True,
            "classIndex": selected_idx,
            "crop": mapping["crop"],
            "disease": mapping["disease"],
            "severity": mapping["severity"],
            "recommendation": mapping["recommendation"],
            "confidence": confidence,
            "simulated": True
        }
        print(json.dumps(output))
        sys.exit(0)

    try:
        import tensorflow as tf
        from keras.models import load_model

        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
        model = load_model(model_path)
        
        img_rgb = img.convert('RGB')
        img_resized = img_rgb.resize((224, 224))
        
        img_array = np.array(img_resized, dtype=np.float32) / 255.0
        img_batch = np.expand_dims(img_array, axis=0)
        
        predictions = model.predict(img_batch, verbose=0)
        class_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][class_idx])

        # If model confidence is very low (< 45%), reject as non-plant / unrecognized
        if confidence < 0.45:
            print(json.dumps({
                "isPlant": False,
                "confidenceTooLow": True,
                "error": "The image could not be identified as a recognizable crop leaf. Please ensure good lighting and focus directly on the leaf."
            }))
            sys.exit(0)

        mapping = CLASS_MAPPING.get(class_idx, {
            "crop": "Unknown",
            "disease": "Unknown",
            "severity": "Unknown",
            "recommendation": "Please contact agricultural support."
        })

        output = {
            "isPlant": True,
            "classIndex": class_idx,
            "crop": mapping["crop"],
            "disease": mapping["disease"],
            "severity": mapping["severity"],
            "recommendation": mapping["recommendation"],
            "confidence": confidence
        }
        
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": f"Error running inference: {str(e)}"}))
        sys.exit(1)

if __name__ == '__main__':
    main()
