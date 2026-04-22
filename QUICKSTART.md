# Quick Start Guide for ML Pipeline

## Directory Structure
```
src/              - Main source code modules
├── config.py          - Configuration management
├── preprocessing.py   - Data preprocessing
├── feature_engineering.py - Feature selection and scaling
├── trainer.py        - Model training
├── evaluator.py      - Model evaluation
└── utils.py          - Utility functions

config/           - Configuration files
├── config.yaml        - Main pipeline configuration

data/             - Data directory
└── cybersecurity_intrusion_data.csv

models/           - Trained models (created at runtime)
reports/          - Evaluation reports (created at runtime)

train.py          - Main entry point
```

## Quick Commands

### 1. Basic Training
```bash
python train.py
```

### 2. With Different Feature Set
```bash
python train.py --feature-set extended
```

### 3. Compare All Features Sets
```bash
python train.py --compare
```

### 4. Custom Configuration
```bash
python train.py --config config/config.yaml
```

## Module Highlights

### DataPreprocessor
- Loads CSV data
- Handles missing values
- Encodes categorical features
- Splits features and target

### FeatureEngineer
- Selects predefined feature sets (core/extended)
- Scales features (standardization/normalization)
- Calculates feature importance
- Provides feature statistics

### ModelTrainer
- Builds RandomForest classifier
- Trains on labeled data
- Makes predictions
- Saves/loads models

### ModelEvaluator
- Calculates accuracy, precision, recall, F1
- Generates confusion matrix
- Produces classification report
- Computes ROC-AUC score

## Configuration (config/config.yaml)

Key sections:
- **data**: File paths, preprocessing options
- **features**: Feature set definitions
- **model**: Model type and hyperparameters
- **evaluation**: Metrics to calculate
- **output**: Model and report directories

## Performance Metrics

The evaluator tracks:
- Accuracy: Overall correctness
- Precision: True positive rate among predicted positives
- Recall: True positive rate among actual positives
- F1-Score: Harmonic mean of precision and recall
- ROC-AUC: Area under ROC curve
- Confusion Matrix: TP, TN, FP, FN counts

## Common Workflows

### 1. Default Pipeline Execution
```bash
python train.py
# → Trains with core features, saves model to models/
```

### 2. Feature Comparison
```bash
python train.py --compare
# → Trains core and extended separately, compares metrics
```

### 3. Custom Hyperparameters
Edit `config/config.yaml`:
```yaml
model:
  params:
    n_estimators: 150
    max_depth: 20
```

### 4. Using in Your Code
```python
from src.trainer import ModelTrainer
from src.evaluator import ModelEvaluator

trainer = ModelTrainer(model_config)
trainer.load_model("models/brute_force_detector.pkl")
y_pred = trainer.predict(X_test)
```

## Next Steps

1. Run the pipeline: `python train.py`
2. Check output in `models/` and `reports/`
3. Modify `config/config.yaml` for experimentation
4. Review `notebooks/eda.ipynb` for exploratory analysis
5. Extend with additional models or features
