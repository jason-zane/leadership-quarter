import math
import os
import secrets
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Response, status
from factor_analyzer import FactorAnalyzer
from factor_analyzer.factor_analyzer import (
    calculate_bartlett_sphericity,
    calculate_kmo,
)
from pydantic import BaseModel, Field
from semopy import Model, calc_stats


class RenderOptions(BaseModel):
    page_size: str = "A4"
    margin: str = "20mm"


class RenderPdfRequest(BaseModel):
    html: str
    options: RenderOptions = Field(default_factory=RenderOptions)


class ValidationScaleItem(BaseModel):
    question_key: str
    text: str
    weight: float = 1.0
    reverse_scored: bool = False


class ValidationScaleDefinition(BaseModel):
    key: str
    label: str
    source: str
    items: list[ValidationScaleItem]


class ValidationRespondent(BaseModel):
    submission_id: str
    group_key: str | None = None
    responses: dict[str, float | None]


class PsychometricValidationRequest(BaseModel):
    analysis_type: str
    assessment_id: str
    grouping_variable: str | None = None
    minimum_sample_n: int = 150
    primary_scales: list[ValidationScaleDefinition]
    legacy_scales: list[ValidationScaleDefinition] = Field(default_factory=list)
    respondents: list[ValidationRespondent]


def require_api_key(api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    expected_key = os.getenv("SIDECAR_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SIDECAR_API_KEY is not configured.",
        )

    if not api_key or not secrets.compare_digest(api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )


app = FastAPI(title="Leadership Quarter Sidecar")
protected_router = APIRouter(dependencies=[Depends(require_api_key)])


def round_or_none(value: Any, digits: int = 6) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(numeric) or math.isinf(numeric):
        return None
    return round(numeric, digits)


def reverse_likert(value: float) -> float:
    return 6 - value


def sample_sd(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    return float(np.std(np.asarray(values, dtype=float), ddof=1))


def cronbach_alpha(frame: pd.DataFrame) -> float | None:
    if frame.shape[1] < 2 or frame.shape[0] < 2:
        return None
    item_vars = frame.var(axis=0, ddof=1)
    total_scores = frame.sum(axis=1)
    total_var = total_scores.var(ddof=1)
    if total_var <= 0:
        return None
    k = frame.shape[1]
    return float((k / (k - 1)) * (1 - item_vars.sum() / total_var))


def corrected_item_total_correlations(frame: pd.DataFrame) -> dict[str, float | None]:
    if frame.shape[1] < 2 or frame.shape[0] < 3:
        return {column: None for column in frame.columns}

    result: dict[str, float | None] = {}
    for column in frame.columns:
        item = frame[column]
        rest = frame.drop(columns=[column]).sum(axis=1)
        if item.std(ddof=1) == 0 or rest.std(ddof=1) == 0:
            result[column] = None
            continue
        result[column] = float(item.corr(rest))
    return result


def alpha_if_deleted(frame: pd.DataFrame) -> dict[str, float | None]:
    if frame.shape[1] <= 2:
        return {column: None for column in frame.columns}
    result: dict[str, float | None] = {}
    for column in frame.columns:
        result[column] = cronbach_alpha(frame.drop(columns=[column]))
    return result


def ceiling_floor(series: pd.Series) -> tuple[float, float]:
    values = series.dropna().tolist()
    if not values:
        return 0.0, 0.0
    count = len(values)
    ceiling = len([value for value in values if value >= 5]) / count
    floor = len([value for value in values if value <= 1]) / count
    return ceiling, floor


def build_scale_frame(
    scale: ValidationScaleDefinition, respondents: list[ValidationRespondent]
) -> pd.DataFrame:
    rows: list[dict[str, float | None]] = []
    for respondent in respondents:
        row: dict[str, float | None] = {}
        for item in scale.items:
            raw = respondent.responses.get(item.question_key)
            if raw is None:
                row[item.question_key] = np.nan
            else:
                row[item.question_key] = (
                    reverse_likert(raw) if item.reverse_scored else raw
                )
        rows.append(row)
    return pd.DataFrame(rows, columns=[item.question_key for item in scale.items], dtype=float)


def build_combined_frame(
    scales: list[ValidationScaleDefinition], respondents: list[ValidationRespondent]
) -> tuple[pd.DataFrame, list[ValidationScaleItem]]:
    deduped: dict[str, ValidationScaleItem] = {}
    for scale in scales:
        for item in scale.items:
            deduped.setdefault(item.question_key, item)

    ordered_items = list(deduped.values())
    rows: list[dict[str, float | None]] = []
    for respondent in respondents:
        row: dict[str, float | None] = {}
        for item in ordered_items:
            raw = respondent.responses.get(item.question_key)
            if raw is None:
                row[item.question_key] = np.nan
            else:
                row[item.question_key] = (
                    reverse_likert(raw) if item.reverse_scored else raw
                )
        rows.append(row)

    return (
        pd.DataFrame(rows, columns=[item.question_key for item in ordered_items], dtype=float),
        ordered_items,
    )


def parallel_analysis(frame: pd.DataFrame, iterations: int = 50) -> list[float]:
    n_rows, n_cols = frame.shape
    if n_rows < 2 or n_cols < 2:
        return []

    eigenvalues = []
    for _ in range(iterations):
        simulated = np.random.normal(size=(n_rows, n_cols))
        corr = np.corrcoef(simulated, rowvar=False)
        eigvals = np.linalg.eigvalsh(corr)[::-1]
        eigenvalues.append(eigvals)

    return np.mean(np.asarray(eigenvalues), axis=0).tolist()


def build_scale_diagnostics(
    scales: list[ValidationScaleDefinition], respondents: list[ValidationRespondent]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    scale_diagnostics: list[dict[str, Any]] = []
    item_diagnostics: list[dict[str, Any]] = []

    for scale in scales:
        frame = build_scale_frame(scale, respondents)
        complete = frame.dropna(axis=0, how="any")
        alpha = cronbach_alpha(complete)
        complete_n = int(complete.shape[0])

        composite_scores = complete.mean(axis=1).tolist() if complete_n > 0 else []
        composite_sd = sample_sd([float(value) for value in composite_scores])
        sem = (
            composite_sd * math.sqrt(max(0.0, 1 - alpha))
            if alpha is not None and composite_sd is not None
            else None
        )

        scale_diagnostics.append(
            {
                "scale_key": scale.key,
                "scale_label": scale.label,
                "source": scale.source,
                "item_count": len(scale.items),
                "complete_n": complete_n,
                "alpha": round_or_none(alpha),
                "alpha_ci_lower": None,
                "alpha_ci_upper": None,
                "sem": round_or_none(sem),
                "missing_rate": round_or_none(1 - (complete_n / len(respondents))) if respondents else None,
                "metadata": {},
            }
        )

        citc = corrected_item_total_correlations(complete) if complete_n >= 3 else {
            item.question_key: None for item in scale.items
        }
        alpha_deleted = alpha_if_deleted(complete) if complete_n >= 2 else {
            item.question_key: None for item in scale.items
        }

        for item in scale.items:
            series = frame[item.question_key]
            observed = series.dropna()
            ceiling_pct, floor_pct = ceiling_floor(series)
            item_diagnostics.append(
                {
                    "scale_key": scale.key,
                    "question_key": item.question_key,
                    "item_label": item.text,
                    "source": scale.source,
                    "reverse_scored": item.reverse_scored,
                    "mean": round_or_none(observed.mean() if len(observed) > 0 else None),
                    "sd": round_or_none(observed.std(ddof=1) if len(observed) > 1 else None),
                    "missing_rate": round_or_none(series.isna().mean()),
                    "floor_pct": round_or_none(floor_pct),
                    "ceiling_pct": round_or_none(ceiling_pct),
                    "citc": round_or_none(citc.get(item.question_key)),
                    "alpha_if_deleted": round_or_none(alpha_deleted.get(item.question_key)),
                    "metadata": {},
                }
            )

    return scale_diagnostics, item_diagnostics


def row_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row:
            return row[key]
    return None


def stats_value(stats: Any, key: str) -> float | None:
    if stats is None:
        return None
    if isinstance(stats, pd.DataFrame):
        if key in stats.columns:
            if "Value" in stats.index:
                return round_or_none(stats.loc["Value", key])
            return round_or_none(stats.iloc[0][key])
        return None
    if isinstance(stats, dict):
        return round_or_none(stats.get(key))
    return round_or_none(getattr(stats, key, None))


def run_efa(
    scales: list[ValidationScaleDefinition], respondents: list[ValidationRespondent]
) -> tuple[list[dict[str, Any]], dict[str, Any], list[str]]:
    warnings: list[str] = []
    frame, items = build_combined_frame(scales, respondents)
    complete = frame.dropna(axis=0, how="any")

    if complete.shape[0] < 2 or complete.shape[1] < 2:
        warnings.append("EFA skipped: not enough complete primary-scale responses.")
        return [], {}, warnings

    try:
        kmo_per_item, kmo_model = calculate_kmo(complete)
        bartlett_chi2, bartlett_p = calculate_bartlett_sphericity(complete)
        corr = np.corrcoef(complete.to_numpy(dtype=float), rowvar=False)
        eigenvalues = np.linalg.eigvalsh(corr)[::-1].real.tolist()
        parallel_eigenvalues = parallel_analysis(complete)
        recommended = max(
            1,
            sum(
                1
                for actual, random_avg in zip(eigenvalues, parallel_eigenvalues)
                if actual > random_avg
            ),
        )
        factor_count = min(recommended, complete.shape[1])

        analyzer = FactorAnalyzer(
            n_factors=factor_count,
            rotation="oblimin",
            method="minres",
        )
        analyzer.fit(complete)

        loadings = analyzer.loadings_
        communalities = analyzer.get_communalities()
        uniquenesses = analyzer.get_uniquenesses()
        phi = getattr(analyzer, "phi_", None)

        factor_correlations: dict[str, float | None] = {}
        if phi is not None:
            for left in range(phi.shape[0]):
                for right in range(left + 1, phi.shape[1]):
                    factor_correlations[f"F{left + 1}:F{right + 1}"] = round_or_none(
                        phi[left, right]
                    )

        model_loadings: list[dict[str, Any]] = []
        for row_index, item in enumerate(items):
            abs_values = [abs(float(value)) for value in loadings[row_index]]
            cross_loading = len([value for value in abs_values if value >= 0.3]) > 1
            retained = max(abs_values) >= 0.3
            for factor_index in range(loadings.shape[1]):
                model_loadings.append(
                    {
                        "scale_key": "primary_structure",
                        "question_key": item.question_key,
                        "factor_key": f"F{factor_index + 1}",
                        "loading": round_or_none(loadings[row_index, factor_index]),
                        "standardized_loading": round_or_none(loadings[row_index, factor_index]),
                        "communality": round_or_none(communalities[row_index]),
                        "uniqueness": round_or_none(uniquenesses[row_index]),
                        "cross_loading": cross_loading,
                        "retained": retained,
                        "metadata": {},
                    }
                )

        return (
            [
                {
                    "model_kind": "efa",
                    "model_name": "primary_structure",
                    "factor_count": factor_count,
                    "rotation": "oblimin",
                    "extraction_method": "minres",
                    "grouping_variable": None,
                    "group_key": None,
                    "adequacy": {
                        "kmo_overall": round_or_none(kmo_model),
                        "kmo_per_item": {
                            item.question_key: round_or_none(kmo_per_item[index])
                            for index, item in enumerate(items)
                        },
                        "bartlett_chi2": round_or_none(bartlett_chi2),
                        "bartlett_p": round_or_none(bartlett_p),
                        "eigenvalues": [round_or_none(value) for value in eigenvalues],
                        "parallel_eigenvalues": [
                            round_or_none(value) for value in parallel_eigenvalues
                        ],
                        "recommended_factor_count": factor_count,
                    },
                    "fit_indices": {},
                    "factor_correlations": factor_correlations,
                    "summary": {
                        "complete_n": int(complete.shape[0]),
                        "item_count": int(complete.shape[1]),
                    },
                    "loadings": model_loadings,
                }
            ],
            {
                "recommended_factor_count": factor_count,
                "efa_complete_n": int(complete.shape[0]),
                "efa_item_count": int(complete.shape[1]),
            },
            warnings,
        )
    except Exception as exc:
        warnings.append(f"EFA failed: {exc}")
        return (
            [],
            {
                "recommended_factor_count": None,
                "efa_complete_n": int(complete.shape[0]),
                "efa_item_count": int(complete.shape[1]),
            },
            warnings,
        )


def latent_name(scale_key: str) -> str:
    cleaned = "".join(char if char.isalnum() or char == "_" else "_" for char in scale_key)
    if cleaned[:1].isdigit():
        cleaned = f"factor_{cleaned}"
    return cleaned or "factor_unknown"


def build_cfa_description(scales: list[ValidationScaleDefinition]) -> tuple[str, dict[str, str]]:
    lines = []
    latent_to_scale: dict[str, str] = {}
    for scale in scales:
        if len(scale.items) < 2:
            continue
        latent = latent_name(scale.key)
        latent_to_scale[latent] = scale.key
        lines.append(f"{latent} =~ {' + '.join(item.question_key for item in scale.items)}")
    return "\n".join(lines), latent_to_scale


def fit_cfa_model(
    scales: list[ValidationScaleDefinition],
    respondents: list[ValidationRespondent],
    model_kind: str,
    model_name: str,
    grouping_variable: str | None = None,
    group_key: str | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    description, latent_to_scale = build_cfa_description(scales)
    if not description:
        return None, "CFA skipped: no multi-item scales available."

    frame, _ = build_combined_frame(scales, respondents)
    complete = frame.dropna(axis=0, how="any")
    if complete.shape[0] < 2 or complete.shape[1] < 2:
        return None, "CFA skipped: not enough complete responses."

    try:
        model = Model(description)
        model.fit(complete)
        estimates = model.inspect(std_est=True)
        stats = calc_stats(model)
    except Exception as exc:
        return None, f"{model_kind.upper()} failed: {exc}"

    fit_indices = {
        "CFI": stats_value(stats, "CFI"),
        "TLI": stats_value(stats, "TLI"),
        "RMSEA": stats_value(stats, "RMSEA"),
        "SRMR": stats_value(stats, "SRMR"),
        "AIC": stats_value(stats, "AIC"),
        "BIC": stats_value(stats, "BIC"),
        "chi2": stats_value(stats, "chi2"),
        "df": stats_value(stats, "DoF"),
        "p_value": stats_value(stats, "p-value"),
    }

    estimate_rows = estimates.to_dict("records")
    raw_loadings: dict[str, list[float]] = {}
    factor_correlations: dict[str, float | None] = {}
    model_loadings: list[dict[str, Any]] = []

    latent_names = set(latent_to_scale.keys())

    for row in estimate_rows:
        op = row_value(row, "op")
        lval = row_value(row, "lval")
        rval = row_value(row, "rval")
        estimate = round_or_none(row_value(row, "Estimate"))
        std_estimate = round_or_none(
            row_value(row, "Est. Std", "Est.Std", "Std.Estimate", "Std Estimate")
        )

        factor_key = None
        question_key = None
        if op == "~" and rval in latent_names:
            factor_key = rval
            question_key = lval
        elif op == "=~" and lval in latent_names:
            factor_key = lval
            question_key = rval
        elif op == "~~" and lval in latent_names and rval in latent_names and lval != rval:
            factor_correlations[f"{lval}:{rval}"] = estimate

        if factor_key is None or question_key is None:
            continue

        standardized = std_estimate if std_estimate is not None else estimate
        raw_loadings.setdefault(question_key, []).append(abs(standardized or 0))
        model_loadings.append(
            {
                "scale_key": latent_to_scale.get(factor_key, factor_key),
                "question_key": question_key,
                "factor_key": factor_key,
                "loading": estimate,
                "standardized_loading": standardized,
                "communality": None,
                "uniqueness": None,
                "cross_loading": False,
                "retained": abs(standardized or 0) >= 0.3,
                "metadata": {},
            }
        )

    for loading in model_loadings:
        standardized = loading["standardized_loading"] or 0
        values = raw_loadings.get(loading["question_key"], [])
        communality = sum(value * value for value in values)
        loading["communality"] = round_or_none(communality)
        loading["uniqueness"] = round_or_none(max(0.0, 1 - communality))
        loading["cross_loading"] = len([value for value in values if value >= 0.3]) > 1

    return (
        {
            "model_kind": model_kind,
            "model_name": model_name,
            "factor_count": len(latent_names),
            "rotation": None,
            "extraction_method": "semopy",
            "grouping_variable": grouping_variable,
            "group_key": group_key,
            "adequacy": {},
            "fit_indices": fit_indices,
            "factor_correlations": factor_correlations,
            "summary": {
                "complete_n": int(complete.shape[0]),
                "item_count": int(complete.shape[1]),
            },
            "loadings": model_loadings,
        },
        None,
    )


def run_cfa(
    scales: list[ValidationScaleDefinition], respondents: list[ValidationRespondent]
) -> tuple[list[dict[str, Any]], list[str]]:
    model, warning = fit_cfa_model(
        scales,
        respondents,
        model_kind="cfa",
        model_name="primary_measurement_model",
    )
    return ([model] if model else []), ([warning] if warning else [])


def run_invariance(
    scales: list[ValidationScaleDefinition],
    respondents: list[ValidationRespondent],
    grouping_variable: str | None,
) -> tuple[list[dict[str, Any]], list[str]]:
    if not grouping_variable:
        return [], ["Invariance skipped: no grouping variable selected."]

    grouped: dict[str, list[ValidationRespondent]] = {}
    for respondent in respondents:
        if not respondent.group_key:
            continue
        grouped.setdefault(respondent.group_key, []).append(respondent)

    valid_groups = {key: value for key, value in grouped.items() if len(value) >= 25}
    if len(valid_groups) < 2:
        return [], ["Invariance skipped: fewer than two groups have at least 25 respondents."]

    results: list[dict[str, Any]] = []
    warnings: list[str] = [
        "Invariance currently uses groupwise CFA summaries and does not yet impose equality constraints across groups."
    ]
    for group_key, group_rows in valid_groups.items():
        model, warning = fit_cfa_model(
            scales,
            group_rows,
            model_kind="invariance",
            model_name=f"group_{group_key}",
            grouping_variable=grouping_variable,
            group_key=group_key,
        )
        if warning:
            warnings.append(f"{group_key}: {warning}")
            continue
        if model:
            results.append(model)

    return results, warnings


def build_recommendations(
    scale_diagnostics: list[dict[str, Any]],
    item_diagnostics: list[dict[str, Any]],
    efa_models: list[dict[str, Any]],
    primary_scale_count: int,
    recommended_factor_count: int | None,
) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []

    for scale in scale_diagnostics:
        alpha = scale.get("alpha")
        if alpha is not None and alpha < 0.6:
            recommendations.append(
                {
                    "scope": "scale",
                    "target_key": scale["scale_key"],
                    "severity": "critical",
                    "code": "low_alpha",
                    "message": f"Scale {scale['scale_label']} has low internal consistency (alpha < 0.60).",
                    "metadata": {},
                }
            )

    for item in item_diagnostics:
        citc = item.get("citc")
        if citc is not None and citc < 0.2:
            recommendations.append(
                {
                    "scope": "item",
                    "target_key": item["question_key"],
                    "severity": "warning",
                    "code": "low_citc",
                    "message": f"Item {item['question_key']} has a low corrected item-total correlation.",
                    "metadata": {"scale_key": item["scale_key"]},
                }
            )

    for model in efa_models:
        for loading in model.get("loadings", []):
            if loading.get("cross_loading"):
                recommendations.append(
                    {
                        "scope": "item",
                        "target_key": loading["question_key"],
                        "severity": "warning",
                        "code": "cross_loading",
                        "message": f"Item {loading['question_key']} cross-loads across multiple factors.",
                        "metadata": {"factor_key": loading["factor_key"]},
                    }
                )

    if recommended_factor_count is not None and recommended_factor_count != primary_scale_count:
        recommendations.append(
            {
                "scope": "assessment",
                "target_key": None,
                "severity": "warning",
                "code": "factor_count_mismatch",
                "message": "The recommended factor count does not match the current primary scale count.",
                "metadata": {
                    "recommended_factor_count": recommended_factor_count,
                    "primary_scale_count": primary_scale_count,
                },
            }
        )

    return recommendations


@app.get("/health")
def health_check():
    return {"status": "ok"}


@protected_router.post("/render-pdf")
def render_pdf(payload: RenderPdfRequest):
    try:
        from weasyprint import CSS, HTML
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF rendering dependencies are not available in this environment.",
        ) from exc

    html = payload.html.strip()
    if not html:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HTML content is required.")

    page_css = CSS(
        string=f"@page {{ size: {payload.options.page_size}; margin: {payload.options.margin}; }}"
    )
    pdf_bytes = HTML(string=html).write_pdf(stylesheets=[page_css])
    return Response(content=pdf_bytes, media_type="application/pdf")


@protected_router.post("/psychometrics/validate")
def validate_psychometrics(payload: PsychometricValidationRequest):
    if len(payload.respondents) < payload.minimum_sample_n:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation requires at least {payload.minimum_sample_n} respondents.",
        )

    scale_diagnostics, item_diagnostics = build_scale_diagnostics(
        payload.primary_scales,
        payload.respondents,
    )

    warnings: list[str] = []
    efa_models: list[dict[str, Any]] = []
    cfa_models: list[dict[str, Any]] = []
    invariance_results: list[dict[str, Any]] = []
    recommended_factor_count: int | None = None

    if payload.analysis_type in {"efa", "full_validation"}:
        efa_models, efa_summary, efa_warnings = run_efa(payload.primary_scales, payload.respondents)
        warnings.extend(efa_warnings)
        recommended_factor_count = efa_summary.get("recommended_factor_count")

    if payload.analysis_type in {"cfa", "full_validation"}:
        models, cfa_warnings = run_cfa(payload.primary_scales, payload.respondents)
        cfa_models.extend(models)
        warnings.extend(cfa_warnings)

    if payload.analysis_type in {"invariance", "full_validation"}:
        models, invariance_warnings = run_invariance(
            payload.primary_scales,
            payload.respondents,
            payload.grouping_variable,
        )
        invariance_results.extend(models)
        warnings.extend(invariance_warnings)

    recommendations = build_recommendations(
        scale_diagnostics,
        item_diagnostics,
        efa_models,
        primary_scale_count=len(payload.primary_scales),
        recommended_factor_count=recommended_factor_count,
    )

    summary = {
        "sample_n": len(payload.respondents),
        "primary_scale_count": len(payload.primary_scales),
        "legacy_scale_count": len(payload.legacy_scales),
        "recommended_factor_count": recommended_factor_count,
        "grouping_variable": payload.grouping_variable,
    }

    return {
        "summary": summary,
        "scale_diagnostics": scale_diagnostics,
        "item_diagnostics": item_diagnostics,
        "efa_models": efa_models,
        "cfa_models": cfa_models,
        "invariance_results": invariance_results,
        "recommendations": recommendations,
        "warnings": warnings,
    }


app.include_router(protected_router)
