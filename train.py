"""Main training pipeline script."""

import sys
import argparse
from pathlib import Path
import pandas as pd
from src.config import Config
from src.preprocessing import DataPreprocessor
from src.feature_engineering import FeatureEngineer
from src.trainer import ModelTrainer
from src.evaluator import ModelEvaluator


def main(config_path: str = "config/config.yaml", feature_set: str = "core"):
    """
    Run the complete ML pipeline.
    
    Args:
        config_path: Path to configuration file
        feature_set: Feature set to use ('core' or 'extended')
    """
    print("\n" + "="*60)
    print("BRUTE FORCE DETECTION - ML PIPELINE")
    print("="*60 + "\n")
    
    # Load configuration
    print("[1/6] Loading configuration...")
    config = Config(config_path)
    print(f"Configuration loaded from {config_path}\n")
    
    # Load and preprocess data
    print("[2/6] Loading and preprocessing data...")
    preprocessor = DataPreprocessor(config.get("data"))
    df = preprocessor.load_data(config.get("data.path"))
    X, y = preprocessor.preprocess(df, fit=True)
    print()
    
    # Feature engineering
    print("[3/6] Feature engineering...")
    feature_eng = FeatureEngineer(config.get("features"))
    X = feature_eng.select_features(X, feature_set=feature_set)
    print()
    
    # Split data
    print("[4/6] Splitting data...")
    trainer = ModelTrainer(config.get("model"))
    data_config = config.get("data")
    X_train, X_test, y_train, y_test = trainer.split_data(
        X, y,
        test_size=data_config.get("test_size", 0.2),
        random_state=data_config.get("random_state", 42),
        stratify=data_config.get("stratify", True)
    )
    print()
    
    # Train model
    print("[5/6] Training model...")
    model_config = config.get("model")
    trainer.build_model(model_config.get("type", "RandomForest"))
    trainer.train(X_train, y_train)
    print()
    
    # Evaluate model
    print("[6/6] Evaluating model...")
    evaluator = ModelEvaluator(config.get("evaluation", {}))
    y_pred = trainer.predict(X_test)
    y_pred_proba = trainer.predict(X_test, return_proba=True)
    
    results = evaluator.evaluate(y_test, y_pred, y_pred_proba)
    evaluator.print_summary()
    evaluator.print_classification_report(y_test, y_pred)
    evaluator.print_confusion_matrix()
    
    # Save model
    print("\n[+] Saving model...")
    output_config = config.get("output", {})
    models_dir = output_config.get("models_dir", "models")
    model_name = output_config.get("model_name", "brute_force_detector.pkl")
    model_path = f"{models_dir}/{model_name}"
    
    Path(models_dir).mkdir(exist_ok=True)
    trainer.save_model(model_path)
    
    print("\n" + "="*60)
    print("PIPELINE COMPLETE!")
    print("="*60 + "\n")
    
    return trainer, evaluator, X_test, y_test


def compare_feature_sets(config_path: str = "config/config.yaml"):
    """
    Compare performance of different feature sets.
    
    Args:
        config_path: Path to configuration file
    """
    print("\n" + "="*60)
    print("COMPARING FEATURE SETS")
    print("="*60 + "\n")
    
    results_comparison = {}
    
    for feature_set in ["core", "extended"]:
        print(f"\n{'='*60}")
        print(f"Running pipeline with {feature_set.upper()} features...")
        print(f"{'='*60}\n")
        
        trainer, evaluator, X_test, y_test = main(config_path, feature_set=feature_set)
        results_comparison[feature_set] = evaluator.get_metrics_summary()
    
    # Print comparison
    print("\n" + "="*60)
    print("FEATURE SET COMPARISON")
    print("="*60)
    
    comparison_df = pd.concat(results_comparison, axis=1)
    print(comparison_df)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train brute force detection model"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config/config.yaml",
        help="Path to configuration file"
    )
    parser.add_argument(
        "--feature-set",
        type=str,
        choices=["core", "extended"],
        default="core",
        help="Feature set to use"
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Compare different feature sets"
    )
    
    args = parser.parse_args()
    
    if args.compare:
        compare_feature_sets(args.config)
    else:
        main(args.config, args.feature_set)
