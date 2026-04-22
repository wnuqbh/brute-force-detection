# Brute Force Attack Detection System

This repository is now focused on the Python ML pipeline for brute-force attack detection.

## Overview

- Backend-only project using `pandas`, `scikit-learn`, and `PyYAML`
- Trains a Random Forest classifier on the intrusion dataset
- Supports configurable preprocessing, feature selection, evaluation, and model persistence

## Project Structure

```text
brute-force-detection/
|-- config/
|   `-- config.yaml
|-- data/
|   `-- cybersecurity_intrusion_data.csv
|-- model/
|   `-- data_exploration.py
|-- models/
|   `-- brute_force_detector.pkl
|-- notebooks/
|   `-- eda.ipynb
|-- src/
|   |-- config.py
|   |-- evaluator.py
|   |-- feature_engineering.py
|   |-- preprocessing.py
|   |-- trainer.py
|   `-- utils.py
|-- PROJECT_OVERVIEW.md
|-- QUICKSTART.md
|-- requirements.txt
`-- train.py
```

## Quick Start

```bash
pip install -r requirements.txt
python train.py
```

Useful commands:

```bash
python train.py --feature-set extended
python train.py --compare
python train.py --config config/config.yaml
```

## Pipeline Flow

1. `DataPreprocessor` loads the CSV, handles missing values, and encodes categorical columns.
2. `FeatureEngineer` selects the configured feature set.
3. `ModelTrainer` splits the data, trains the classifier, and saves the model.
4. `ModelEvaluator` reports accuracy, precision, recall, F1, ROC-AUC, and confusion-matrix metrics.

## Output

- Trained model: `models/brute_force_detector.pkl`
- Console metrics from the evaluator during training

## Notes

- `QUICKSTART.md` contains the fastest backend workflow.
- `PROJECT_OVERVIEW.md` contains the fuller project description for the ML pipeline.
