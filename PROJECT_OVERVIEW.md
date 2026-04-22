# Brute Force Detection Project Overview

## Scope

This project currently contains the machine learning pipeline only. The frontend dashboard has been removed so the repository can be rebuilt from a clean backend foundation.

## Current Architecture

```text
Dataset CSV
   |
   v
DataPreprocessor
   |
   v
FeatureEngineer
   |
   v
ModelTrainer
   |
   v
ModelEvaluator
   |
   v
Saved Model
```

## Key Directories

- `src/`: pipeline modules for config, preprocessing, feature engineering, training, evaluation, and utilities
- `config/`: YAML configuration
- `data/`: source dataset
- `models/`: saved trained model artifacts
- `model/`: older exploration scripts
- `notebooks/`: notebook-based exploration

## Main Entry Point

- `train.py` runs the end-to-end training flow

## Pipeline Responsibilities

### `src/config.py`

Loads YAML configuration and supports dot-notation access.

### `src/preprocessing.py`

- Loads the dataset from disk
- Separates features and target
- Handles missing values
- Encodes categorical columns

### `src/feature_engineering.py`

- Chooses `core`, `extended`, or all available features
- Supports scaling helpers and feature ranking helpers

### `src/trainer.py`

- Splits train and test data
- Builds the configured model
- Trains, predicts, saves, and loads models

### `src/evaluator.py`

- Calculates classification metrics
- Prints confusion matrices and summaries
- Produces a compact metrics table

## Typical Workflow

```bash
pip install -r requirements.txt
python train.py
python train.py --feature-set extended
python train.py --compare
```

## Configuration Highlights

`config/config.yaml` controls:

- dataset path
- target and dropped columns
- feature sets
- model hyperparameters
- evaluation settings
- output model path

## Suggested Next Step

If you want to rebuild the interface from zero, the cleanest path is to design a new API contract first, then scaffold a fresh frontend around that contract rather than trying to reuse the deleted dashboard structure.
