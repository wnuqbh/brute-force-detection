"""Main training pipeline script."""

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    fbeta_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
    average_precision_score,
)

from src.config import Config
from src.preprocessing import DataPreprocessor
from src.feature_engineering import FeatureEngineer
from src.trainer import ModelTrainer


def add_engineered_features(X: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived features from existing columns.
    Must be called separately on train and test to avoid leakage.

    Dataset meaning:
    higher ip_reputation_score = more suspicious IP
    lower ip_reputation_score = safer IP
    """
    X = X.copy()

    # failed_login_ratio: rate of failure per attempt
    if "failed_logins" in X.columns and "login_attempts" in X.columns:
        X["failed_login_ratio"] = X["failed_logins"] / (
            X["login_attempts"] + 1e-6
        )

    # risk_score:
    # high failed ratio + high IP reputation score = high risk
    if "failed_login_ratio" in X.columns and "ip_reputation_score" in X.columns:
        X["risk_score"] = X["failed_login_ratio"] * X["ip_reputation_score"]

    return X


def apply_resampling(X_train, y_train, preprocessing_config):
    """
    Apply SMOTE only on training data.
    SMOTE must be applied after train-test split to avoid data leakage.
    """
    resampling_config = preprocessing_config.get("resampling", {})
    method = resampling_config.get("method")

    if not method:
        return X_train, y_train

    if method.lower() != "smote":
        print(f"Resampling method '{method}' is not supported. Skipping.")
        return X_train, y_train

    try:
        from imblearn.over_sampling import SMOTE
    except ImportError:
        print("[WARNING] imbalanced-learn is not installed.")
        print("[WARNING] Run: python -m pip install imbalanced-learn")
        print("[WARNING] Continuing without SMOTE.")
        return X_train, y_train

    random_state = resampling_config.get("random_state", 42)
    raw_strategy = resampling_config.get("sampling_strategy", "minority")

    # Safeguard: if float strategy would require shrinking minority, fall back
    if isinstance(raw_strategy, float):
        counts        = pd.Series(y_train).value_counts()
        current_ratio = counts.min() / counts.max()
        if raw_strategy <= current_ratio:
            print(f"[WARNING] sampling_strategy={raw_strategy} <= current ratio={current_ratio:.3f}.")
            print("[WARNING] Falling back to sampling_strategy='minority'.")
            raw_strategy = "minority"

    print("[+] Applying SMOTE resampling...")
    try:
        smote = SMOTE(sampling_strategy=raw_strategy, random_state=random_state)
        X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
        print(f"Before SMOTE: X={X_train.shape}, y={y_train.shape}")
        print(f"After SMOTE:  X={X_resampled.shape}, y={y_resampled.shape}")
        return X_resampled, y_resampled

    except ValueError as error:
        print("[WARNING] SMOTE could not be applied.")
        print(f"[WARNING] Reason: {error}")
        print("[WARNING] Continuing without SMOTE.")
        return X_train, y_train


def extract_positive_probabilities(y_pred_proba):
    """
    Convert probability output into class-1 probabilities.
    """
    y_pred_proba = np.asarray(y_pred_proba)

    if y_pred_proba.ndim == 2:
        return y_pred_proba[:, 1]

    return y_pred_proba


def evaluate_with_threshold(y_test, positive_probs, threshold):
    """
    Evaluate model using a custom decision threshold.
    """
    y_pred = (positive_probs >= threshold).astype(int)

    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall    = recall_score(y_test, y_pred, zero_division=0)
    f1        = f1_score(y_test, y_pred, zero_division=0)
    f2        = fbeta_score(y_test, y_pred, beta=2, zero_division=0)
    roc_auc   = roc_auc_score(y_test, positive_probs)
    pr_auc    = average_precision_score(y_test, positive_probs)

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)

    summary = pd.DataFrame(
        {
            "value": {
                "accuracy":  accuracy,
                "precision": precision,
                "recall":    recall,
                "f1":        f1,
                "f2":        f2,
                "roc_auc":   roc_auc,
                "pr_auc":    pr_auc,
                "threshold": threshold,
            }
        }
    )

    print(summary)
    print()
    print(f"Sensitivity (Recall):  {recall:.4f}")
    print(f"Specificity:           {specificity:.4f}")
    print(f"Precision (PPV):       {precision:.4f}")

    print("\n" + "=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)
    print(classification_report(y_test, y_pred, zero_division=0))

    print("\n" + "=" * 60)
    print("CONFUSION MATRIX")
    print("=" * 60)
    print(cm)
    print()
    print(f"True Negatives:  {tn}")
    print(f"False Positives: {fp}")
    print(f"False Negatives: {fn}")
    print(f"True Positives:  {tp}")

    return {
        "accuracy":  accuracy,
        "precision": precision,
        "recall":    recall,
        "f1":        f1,
        "f2":        f2,
        "roc_auc":   roc_auc,
        "pr_auc":    pr_auc,
        "threshold": threshold,
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }


def print_threshold_analysis(y_test, positive_probs):
    """
    Print threshold comparison table and return as DataFrame.
    """
    print("\n" + "=" * 60)
    print("THRESHOLD ANALYSIS")
    print("=" * 60)

    rows = []

    for threshold in [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]:
        y_pred = (positive_probs >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()

        rows.append(
            {
                "threshold":       threshold,
                "accuracy":        accuracy_score(y_test, y_pred),
                "precision":       precision_score(y_test, y_pred, zero_division=0),
                "recall":          recall_score(y_test, y_pred, zero_division=0),
                "f1":              f1_score(y_test, y_pred, zero_division=0),
                "f2":              fbeta_score(y_test, y_pred, beta=2, zero_division=0),
                "false_negatives": fn,
                "false_positives": fp,
            }
        )

    analysis_df = pd.DataFrame(rows)
    print(analysis_df.to_string(index=False))

    return analysis_df


def print_feature_importance(trainer, feature_names: list) -> pd.DataFrame:
    """
    Print feature importances from the trained Random Forest model.
    """
    importances = trainer.model.feature_importances_

    df = pd.DataFrame({
        "feature":    feature_names,
        "importance": importances,
    }).sort_values("importance", ascending=False)

    df["importance_pct"] = (df["importance"] * 100).round(2)

    print("\n" + "=" * 60)
    print("FEATURE IMPORTANCE")
    print("=" * 60)
    print(df.to_string(index=False))

    return df


def save_html_report(
    results: dict,
    reports_dir: str,
    feature_importance_df: pd.DataFrame = None,
    threshold_df: pd.DataFrame = None,
):
    """
    Save an HTML evaluation report to the reports directory.
    Satisfies the Visualization Dashboard scope requirement.
    Opens directly in any browser — no server needed.
    """
    Path(reports_dir).mkdir(exist_ok=True)

    # Feature importance rows with inline bar chart
    fi_rows = ""
    if feature_importance_df is not None:
        for _, row in feature_importance_df.iterrows():
            bar_width = int(row["importance_pct"] * 2)
            fi_rows += f"""
                <tr>
                    <td>{row['feature']}</td>
                    <td>{row['importance_pct']}%</td>
                    <td>
                        <div style="background:#4CAF50;height:16px;width:{bar_width}px;
                             border-radius:3px;"></div>
                    </td>
                </tr>"""

    fi_section = ""
    if fi_rows:
        fi_section = f"""
        <div class="section">
            <h3>Feature Importance</h3>
            <table>
                <tr><th>Feature</th><th>Importance</th><th>Bar</th></tr>
                {fi_rows}
            </table>
        </div>"""

    # Threshold analysis table
    threshold_section = ""
    if threshold_df is not None:
        threshold_section = f"""
        <div class="section">
            <h3>Threshold Analysis</h3>
            {threshold_df.to_html(index=False, float_format=lambda x: f"{x:.4f}")}
        </div>"""

    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Brute Force Detection Report</title>
    <style>
        body       {{ font-family: Arial, sans-serif; margin: 40px;
                      background: #f4f6f8; color: #2c3e50; }}
        h1         {{ color: #2c3e50; border-bottom: 2px solid #4CAF50;
                      padding-bottom: 10px; }}
        h3         {{ color: #34495e; margin-top: 0; }}
        table      {{ border-collapse: collapse; width: 100%;
                      margin-bottom: 10px; background: white; }}
        th, td     {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
        th         {{ background-color: #4CAF50; color: white; }}
        tr:hover   {{ background-color: #f9f9f9; }}
        .attack    {{ color: #e74c3c; font-weight: bold; }}
        .normal    {{ color: #27ae60; font-weight: bold; }}
        .badge     {{ display: inline-block; padding: 5px 14px; border-radius: 4px;
                      font-weight: bold; color: white; margin-right: 6px;
                      font-size: 13px; }}
        .red       {{ background: #e74c3c; }}
        .green     {{ background: #27ae60; }}
        .section   {{ background: white; padding: 24px; border-radius: 8px;
                      margin-bottom: 20px;
                      box-shadow: 0 1px 4px rgba(0,0,0,0.1); }}
        .grid      {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        .meta      {{ font-size: 14px; color: #7f8c8d; margin-bottom: 24px; }}
    </style>
</head>
<body>

<h1>&#128737; Brute Force Detection &mdash; Evaluation Report</h1>
<p class="meta">
    <strong>Model:</strong> Random Forest &nbsp;|&nbsp;
    <strong>Decision Threshold:</strong> {results['threshold']} &nbsp;|&nbsp;
    <strong>Features:</strong> login_attempts, failed_logins,
    ip_reputation_score, failed_login_ratio, risk_score
</p>

<div class="grid">

    <div class="section">
        <h3>Performance Summary</h3>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Accuracy</td>            <td>{results['accuracy']:.4f}</td></tr>
            <tr><td>Recall (Sensitivity)</td><td>{results['recall']:.4f}</td></tr>
            <tr><td>Precision</td>           <td>{results['precision']:.4f}</td></tr>
            <tr><td>F1 Score</td>            <td>{results['f1']:.4f}</td></tr>
            <tr><td>F2 Score</td>            <td>{results['f2']:.4f}</td></tr>
            <tr><td>ROC-AUC</td>             <td>{results['roc_auc']:.4f}</td></tr>
            <tr><td>PR-AUC</td>              <td>{results['pr_auc']:.4f}</td></tr>
        </table>
    </div>

    <div class="section">
        <h3>Confusion Matrix</h3>
        <table>
            <tr>
                <th></th>
                <th>Predicted Normal</th>
                <th>Predicted Attack</th>
            </tr>
            <tr>
                <td><strong>Actual Normal</strong></td>
                <td class="normal">{results['tn']} (TN)</td>
                <td class="attack">{results['fp']} (FP)</td>
            </tr>
            <tr>
                <td><strong>Actual Attack</strong></td>
                <td class="attack">{results['fn']} (FN)</td>
                <td class="normal">{results['tp']} (TP)</td>
            </tr>
        </table>
        <p style="margin-top:14px;">
            <span class="badge green">TN: {results['tn']}</span>
            <span class="badge red">FP: {results['fp']}</span>
            <span class="badge red">FN: {results['fn']}</span>
            <span class="badge green">TP: {results['tp']}</span>
        </p>
    </div>

</div>

{fi_section}

{threshold_section}

</body>
</html>"""

    report_path = Path(reports_dir) / "evaluation_report.html"
    report_path.write_text(html, encoding="utf-8")
    print(f"[+] HTML report saved to {report_path}")


def save_model_metadata(models_dir, threshold, selected_features):
    """
    Save decision threshold and feature order for inference/API usage.
    """
    metadata = {
        "decision_threshold": threshold,
        "features":           selected_features,
    }

    metadata_path = Path(models_dir) / "model_metadata.pkl"
    joblib.dump(metadata, metadata_path)

    print(f"Model metadata saved to {metadata_path}")


def main(config_path: str = "config/config.yaml", feature_set: str = "core"):
    """
    Run the complete ML pipeline.
    """
    print("\n" + "=" * 60)
    print("BRUTE FORCE DETECTION - ML PIPELINE")
    print("=" * 60 + "\n")

    # [1/6] Load configuration
    print("[1/6] Loading configuration...")
    config = Config(config_path)
    print(f"Configuration loaded from {config_path}\n")

    # [2/6] Load and preprocess data
    print("[2/6] Loading and preprocessing data...")
    preprocessor = DataPreprocessor(config.get("data"))
    df = preprocessor.load_data(config.get("data.path"))
    X, y = preprocessor.preprocess(df, fit=True)
    print()

    # [3/6] Select base features — engineering happens after split
    print("[3/6] Feature engineering...")
    feature_eng = FeatureEngineer(config.get("features"))
    X = feature_eng.select_features(X, feature_set=feature_set)
    print("Base features selected:")
    print(list(X.columns))
    print()

    # [4/6] Split BEFORE engineering to prevent leakage
    print("[4/6] Splitting data...")
    trainer     = ModelTrainer(config.get("model"))
    data_config = config.get("data")

    X_train, X_test, y_train, y_test = trainer.split_data(
        X,
        y,
        test_size=data_config.get("test_size", 0.2),
        random_state=data_config.get("random_state", 42),
        stratify=data_config.get("stratify", True),
    )

    print(f"Data split: Train={len(X_train)}, Test={len(X_test)}")

    from pathlib import Path
    import numpy as np

    # Save raw unseen test data for evaluation or dashboard demo
    output_dir = Path("data")
    output_dir.mkdir(parents=True, exist_ok=True)

    unseen_test_data = X_test.copy().reset_index(drop=True)
    unseen_test_data["actual_label"] = np.asarray(y_test)

    unseen_test_data.to_csv(output_dir / "unseen_test_data_raw.csv", index=False)

    print("Raw unseen test data saved to data/unseen_test_data_raw.csv")

    # Engineer features on train and test independently (no leakage)
    X_train = add_engineered_features(X_train)
    X_test  = add_engineered_features(X_test)

    selected_features = list(X_train.columns)
    print("\nFinal features (including engineered):")
    print(selected_features)
    print()

    # Apply SMOTE on training set only
    preprocessing_config = config.get("preprocessing", {})
    X_train, y_train = apply_resampling(X_train, y_train, preprocessing_config)
    print()

    # [5/6] Train model
    print("[5/6] Training model...")
    model_config = config.get("model")
    trainer.build_model(model_config.get("type", "RandomForest"))
    trainer.train(X_train, y_train)
    print()

    # [6/6] Evaluate model
    print("[6/6] Evaluating model...")
    y_pred_proba       = trainer.predict(X_test, return_proba=True)
    positive_probs     = extract_positive_probabilities(y_pred_proba)
    decision_threshold = model_config.get("decision_threshold", 0.50)
    print(f"[DEBUG] Decision threshold used: {decision_threshold}")

    results = evaluate_with_threshold(
        y_test=y_test,
        positive_probs=positive_probs,
        threshold=decision_threshold,
    )

    # Feature importance
    fi_df = print_feature_importance(trainer, selected_features)

    # Threshold analysis
    evaluation_config = config.get("evaluation", {})
    threshold_df = None
    if evaluation_config.get("threshold_analysis", False):
        threshold_df = print_threshold_analysis(y_test, positive_probs)

    # Save model
    print("\n[+] Saving model...")
    output_config = config.get("output", {})
    models_dir    = output_config.get("models_dir", "models")
    reports_dir   = output_config.get("reports_dir", "reports")
    model_name    = output_config.get("model_name", "brute_force_detector.pkl")
    model_path    = f"{models_dir}/{model_name}"

    Path(models_dir).mkdir(exist_ok=True)
    trainer.save_model(model_path)

    if output_config.get("save_threshold", False):
        save_model_metadata(models_dir, decision_threshold, selected_features)

    # Save HTML report
    save_html_report(results, reports_dir, fi_df, threshold_df)

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE!")
    print("=" * 60 + "\n")

    return trainer, results, X_test, y_test


def compare_feature_sets(config_path: str = "config/config.yaml"):
    """
    Compare performance of core vs extended feature sets.
    """
    print("\n" + "=" * 60)
    print("COMPARING FEATURE SETS")
    print("=" * 60 + "\n")

    results_comparison = {}

    for feature_set in ["core", "extended"]:
        print(f"\n{'=' * 60}")
        print(f"Running pipeline with {feature_set.upper()} features...")
        print(f"{'=' * 60}\n")

        trainer, results, X_test, y_test = main(config_path, feature_set=feature_set)
        results_comparison[feature_set] = results

    print("\n" + "=" * 60)
    print("FEATURE SET COMPARISON")
    print("=" * 60)

    comparison_df = pd.DataFrame(results_comparison)
    print(comparison_df)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train brute force detection model"
    )

    parser.add_argument(
        "--config",
        type=str,
        default="config/config.yaml",
        help="Path to configuration file",
    )

    parser.add_argument(
        "--feature-set",
        type=str,
        choices=["core", "extended"],
        default="core",
        help="Feature set to use",
    )

    parser.add_argument(
        "--compare",
        action="store_true",
        help="Compare different feature sets",
    )

    args = parser.parse_args()

    if args.compare:
        compare_feature_sets(args.config)
    else:
        main(args.config, args.feature_set)