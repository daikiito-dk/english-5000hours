#!/usr/bin/env python3
"""
Build script for English 5,000 Hours Mastery Project Dashboard.
Parses logs/*.md, notes/*.md, calculates stats, and generates data.json.
Also updates README.md with the latest total hours if needed.
"""

import os
import re
import json
import glob
from datetime import datetime, date

START_DATE = date(2026, 9, 21)
TARGET_DATE = date(2030, 11, 18)
TARGET_HOURS = 5000.0

PHASES = [
    {
        "id": 1,
        "name": "Phase 1: Foundation Reconstruction",
        "short_name": "Phase 1: Foundation",
        "hours_range": [0, 1000],
        "duration": "~10 months",
        "description": "Thorough acquisition of core vocabulary, grammar, and pronunciation. Daily podcast listening and online conversation.",
        "skills": ["Core Vocab & Grammar", "Pronunciation & Shadowing", "Daily Podcast Listening", "Online Conversation Launch"]
    },
    {
        "id": 2,
        "name": "Phase 2: Practice & Habituation",
        "short_name": "Phase 2: Practice",
        "hours_range": [1000, 2500],
        "duration": "~15 months",
        "description": "Extensive reading of news and books; targeting TOEIC 900+ and Eiken Grade 1.",
        "skills": ["Extensive Reading (News/Books)", "TOEIC 900+ / Eiken 1", "Journal & Summary Writing", "Intermediate Discussion"]
    },
    {
        "id": 3,
        "name": "Phase 3: English Brain Solidification",
        "short_name": "Phase 3: Solidification",
        "hours_range": [2500, 4000],
        "duration": "~15 months",
        "description": "Total immersion: personal research, hobbies, and work conducted entirely in English.",
        "skills": ["100% English Immersion", "Work & Technical Docs", "English Writing & Social Output", "Thinking in English"]
    },
    {
        "id": 4,
        "name": "Phase 4: Mastery & Fluency",
        "short_name": "Phase 4: Mastery",
        "hours_range": [4000, 5000],
        "duration": "~10 months",
        "description": "High-level debate, native-level nuance comprehension, and effortless spontaneity.",
        "skills": ["Advanced Debate & Negotiation", "Cultural Nuance & Wit", "Effortless Spontaneity", "Native-Level Fluency"]
    }
]


def parse_logs():
    total_hours = 0.0
    category_hours = {
        "listening": 0.0,
        "speaking": 0.0,
        "speaking_real": 0.0,  # subset of "speaking": real-stakes calls (interviews, recruiter calls), tagged "(real)" in the log line
        "reading": 0.0,
        "writing": 0.0,
        "other": 0.0
    }
    # Per-service hours from "[svc:id]" tags, for accurate ROI attribution (see compute_roi).
    # tagged_categories records which category buckets have at least one such tag, so
    # compute_roi knows whether to trust per-service data or fall back to the old
    # rough whole-category estimate for a bucket that hasn't been tagged at all yet.
    service_hours = {}
    tagged_categories = set()
    daily_records = {}
    monthly_records = {}

    log_files = sorted(glob.glob("logs/*.md"))

    for log_path in log_files:
        month_match = re.search(r"(\d{4}-\d{2})\.md", log_path)
        month_str = month_match.group(1) if month_match else "unknown"
        monthly_hours = 0.0

        with open(log_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse days
        day_sections = re.split(r"\n##\s+", content)
        for section in day_sections[1:]:
            lines = section.strip().split("\n")
            header = lines[0]
            date_match = re.search(r"(\d{4}-\d{2}-\d{2})", header)
            if not date_match:
                continue
            date_str = date_match.group(1)

            day_total = 0.0
            breakdown = []
            notes = ""
            is_notes = False

            for line in lines[1:]:
                # Total Time match
                time_match = re.search(r"- \*\*Total Time\*\*:\s*([0-9.]+)\s*hrs?", line, re.IGNORECASE)
                if time_match:
                    day_total = float(time_match.group(1))

                # Category task match
                cat_match = re.search(r"-\s*\[([ xX])\]\s*([^:]+):\s*([0-9.]+)\s*hrs?", line)
                if cat_match:
                    checked = cat_match.group(1).lower() == "x"
                    name = cat_match.group(2).strip()
                    hours = float(cat_match.group(3))

                    # "(real)" tag marks real-stakes speaking (HR/recruiter calls, live
                    # interviews) as distinct from low-stakes practice — same "speaking"
                    # bucket for hours, but tracked separately so the two don't blend.
                    is_real = "(real)" in name.lower()
                    name_clean = re.sub(r"\(real\)", "", name, flags=re.IGNORECASE).strip()

                    # "[svc=id]" tag attributes this line's hours to a specific service in
                    # costs.subscriptions (see compute_roi), for accurate per-service ROI.
                    # Uses "=" not ":" because the outer cat_match regex splits the whole
                    # line on the first ":", so a tag containing ":" would break that split.
                    svc_match = re.search(r"\[svc=([\w-]+)\]", name_clean, re.IGNORECASE)
                    svc_id = svc_match.group(1) if svc_match else None
                    name_clean = re.sub(r"\[svc=[\w-]+\]", "", name_clean, flags=re.IGNORECASE).strip()

                    breakdown.append({
                        "name": name_clean,
                        "hours": hours,
                        "completed": checked,
                        "is_real": is_real
                    })

                    # Categorize
                    name_lower = name_clean.lower()
                    if "listen" in name_lower or "podcast" in name_lower or "audio" in name_lower:
                        category_hours["listening"] += hours
                        category_bucket = "listening"
                    elif "speak" in name_lower or "lesson" in name_lower or "conversation" in name_lower:
                        category_hours["speaking"] += hours
                        if is_real:
                            category_hours["speaking_real"] += hours
                        category_bucket = "speaking"
                    elif "read" in name_lower or "vocab" in name_lower or "grammar" in name_lower or "book" in name_lower:
                        category_hours["reading"] += hours
                        category_bucket = "reading"
                    elif "write" in name_lower or "journal" in name_lower or "essay" in name_lower:
                        category_hours["writing"] += hours
                        category_bucket = "writing"
                    else:
                        category_hours["other"] += hours
                        category_bucket = "other"

                    if svc_id:
                        service_hours[svc_id] = service_hours.get(svc_id, 0.0) + hours
                        tagged_categories.add(category_bucket)

                # Notes & Takeaways
                if "Notes & Takeaways" in line:
                    is_notes = True
                    continue
                if is_notes and line.strip().startswith("-"):
                    note_text = line.strip().lstrip("-").strip()
                    if note_text:
                        notes += ("; " if notes else "") + note_text

            daily_records[date_str] = {
                "date": date_str,
                "hours": day_total,
                "breakdown": breakdown,
                "notes": notes
            }
            monthly_hours += day_total
            total_hours += day_total

        monthly_records[month_str] = {
            "month": month_str,
            "hours": round(monthly_hours, 2),
            "target": 33.0 if month_str == "2026-09" else 100.0
        }

    return {
        "total_hours": round(total_hours, 2),
        "category_hours": {k: round(v, 2) for k, v in category_hours.items()},
        "daily_records": daily_records,
        "monthly_records": monthly_records,
        "service_hours": {k: round(v, 2) for k, v in service_hours.items()},
        "tagged_categories": tagged_categories
    }

def parse_vocabulary():
    vocab_file = "notes/vocabulary.md"
    if not os.path.exists(vocab_file):
        return {"count": 0, "items": []}

    with open(vocab_file, "r", encoding="utf-8") as f:
        content = f.read()

    items = []
    sections = re.split(r"\n###\s+", content)
    for sec in sections[1:]:
        lines = sec.strip().split("\n")
        term = lines[0].strip()
        if term.startswith("[") or "Word or Phrase" in term:
            continue
        meaning = ""
        context = ""
        example = ""

        for line in lines[1:]:
            m_match = re.search(r"- \*\*意味\*\*:\s*(.+)", line)
            if m_match:
                meaning = m_match.group(1).strip()
            c_match = re.search(r"- \*\*ニュアンス.*?\*\*:\s*(.+)", line)
            if c_match:
                context = c_match.group(1).strip()
            e_match = re.search(r"- \*(.+?)\*\s*(?:\((.+?)\))?", line)
            if e_match and not example:
                example = e_match.group(1).strip()
                if e_match.group(2):
                    example += f" ({e_match.group(2).strip()})"

        items.append({
            "term": term,
            "meaning": meaning,
            "context": context,
            "example": example
        })

    return {"count": len(items), "items": items}

def parse_reading_notes():
    reading_file = "notes/reading-notes.md"
    if not os.path.exists(reading_file):
        return {"count": 0, "items": []}

    with open(reading_file, "r", encoding="utf-8") as f:
        content = f.read()

    items = []
    sections = re.split(r"\n###\s+", content)
    for sec in sections[1:]:
        lines = sec.strip().split("\n")
        title = lines[0].strip()
        if title.startswith("[") or "タイトル" in title:
            continue
        source = ""
        summary = ""
        reflection = ""
        for line in lines[1:]:
            s_match = re.search(r"- \*\*媒体.*?\*\*:\s*(.+)", line)
            if s_match:
                source = s_match.group(1).strip()
            sum_match = re.search(r"- \*\*要約.*?\*\*:\s*(.+)", line)
            if sum_match:
                summary = sum_match.group(1).strip()
            ref_match = re.search(r"- \*\*自分の考え.*?\*\*:\s*(.+)", line)
            if ref_match:
                reflection = ref_match.group(1).strip()

        items.append({
            "title": title,
            "source": source,
            "summary": summary,
            "reflection": reflection
        })

    return {"count": len(items), "items": items}


def compute_roi(log_data, today):
    """
    Reads costs from the existing data.json (or defaults),
    computes cumulative investment and cost-per-hour per service.
    """
    costs_config = {"currency": "JPY", "subscriptions": [], "one_time": []}
    try:
        with open("data.json", "r", encoding="utf-8") as f:
            existing = json.load(f)
        costs_config = existing.get("costs", costs_config)
    except Exception:
        pass

    breakdown = []
    total_invested = 0
    monthly_spend = 0

    for sub in costs_config.get("subscriptions", []):
        start_str = sub.get("start_month", today.strftime("%Y-%m"))
        end_str = sub.get("end_month")  # None = still active

        start_ym = datetime.strptime(start_str, "%Y-%m").date().replace(day=1)
        end_ym = datetime.strptime(end_str, "%Y-%m").date().replace(day=1) if end_str else today.replace(day=1)

        # Count months (inclusive)
        months_active = max(1, (end_ym.year - start_ym.year) * 12 + (end_ym.month - start_ym.month) + 1)
        cost_total = sub["monthly_yen"] * months_active
        total_invested += cost_total

        if not end_str:
            monthly_spend += sub["monthly_yen"]

        # Hours logged for this service. Prefer precise per-service hours from
        # "[svc:id]" tags in the logs. Only fall back to the old rough whole-category
        # estimate for a category bucket that has never used tagging at all — once any
        # service in a bucket is tagged, every service in that bucket is expected to be
        # tagged too, so an untagged/never-tagged service correctly shows 0 rather than
        # inheriting hours that really belong to a different service in the same bucket.
        category_kw = sub.get("category", "").lower()
        cat_hours = log_data["category_hours"]
        service_hours = log_data.get("service_hours", {})
        tagged_categories = log_data.get("tagged_categories", set())

        if "listen" in category_kw or "drama" in category_kw or "podcast" in category_kw:
            bucket = "listening"
        elif "speak" in category_kw or "conversation" in category_kw:
            bucket = "speaking"
        elif "read" in category_kw or "vocab" in category_kw:
            bucket = "reading"
        elif "writ" in category_kw or "journal" in category_kw:
            bucket = "writing"
        else:
            bucket = None

        if bucket and bucket in tagged_categories:
            hours_for_service = service_hours.get(sub.get("id", ""), 0.0)
        elif bucket:
            hours_for_service = cat_hours.get(bucket, 0.0)
        else:
            hours_for_service = log_data["total_hours"]

        cph = round(cost_total / hours_for_service, 2) if hours_for_service > 0 else None

        breakdown.append({
            "id": sub.get("id", sub["service"].lower()),
            "service": sub["service"],
            "provider": sub.get("provider", ""),
            "plan": sub.get("plan", ""),
            "category": sub.get("category", ""),
            "monthly_yen": sub["monthly_yen"],
            "months_active": months_active,
            "total_yen": cost_total,
            "hours_logged": round(hours_for_service, 2),
            "cost_per_hour_yen": cph,
            "note": sub.get("note", "")
        })

    # One-time purchases
    for item in costs_config.get("one_time", []):
        total_invested += item.get("yen", 0)
        hours_for_item = item.get("hours_logged", 0.0)
        cph = round(item["yen"] / hours_for_item, 2) if hours_for_item > 0 else None
        breakdown.append({
            "id": item.get("id", ""),
            "service": item.get("name", ""),
            "provider": item.get("provider", ""),
            "plan": "One-time",
            "category": item.get("category", ""),
            "monthly_yen": 0,
            "months_active": 1,
            "total_yen": item.get("yen", 0),
            "hours_logged": round(hours_for_item, 2),
            "cost_per_hour_yen": cph,
            "note": item.get("note", "")
        })

    total_hours_all = log_data["total_hours"]
    overall_cph = round(total_invested / total_hours_all, 2) if total_hours_all > 0 else None

    # Total Cost of Ownership: money spent + the value of the time actually put in
    # (study/practice hours valued at the person's own hourly wage), not just cash
    # outlay. Commute/prep time isn't tracked separately from study hours today, so
    # it's folded into total_hours_all rather than added on top.
    hourly_wage_yen = costs_config.get("hourly_wage_yen", 0)
    time_value_yen = round(total_hours_all * hourly_wage_yen, 2)
    tco_yen = round(total_invested + time_value_yen, 2)

    return {
        "_costs_config": costs_config,
        "currency": costs_config.get("currency", "JPY"),
        "total_invested_yen": total_invested,
        "monthly_spend_yen": monthly_spend,
        "total_hours_from_paid_tools": round(total_hours_all, 2),
        "cost_per_hour_yen": overall_cph,
        "hourly_wage_yen": hourly_wage_yen,
        "time_value_yen": time_value_yen,
        "tco_yen": tco_yen,
        "breakdown": breakdown
    }


def load_assessments():
    """
    Reads the assessment history from the existing data.json (persisted the same
    way costs.subscriptions is), seeding it with the baseline on first run. New
    entries (a retest, a CEFR re-evaluation) are added by editing this array
    directly in data.json and re-running build.py.
    """
    try:
        with open("data.json", "r", encoding="utf-8") as f:
            existing = json.load(f)
        assessments = existing.get("assessments")
        if assessments:
            return assessments
    except Exception:
        pass
    return [{
        "date": "2026-09-21",
        "type": "TOEIC",
        "score": 420,
        "cefr_overall": "B1 low",
        "note": "Baseline (CEST Speaking Assessment 2025-05-26 + TOEIC 420)"
    }]


def compute_output_roi(assessments, total_invested_yen, total_hours):
    """
    Output-side ROI: cost per test-score point gained, and the total cost/time
    to go up one CEFR level. Both need a second assessment to compare against
    the baseline — with only one data point on file, they report as None so the
    UI can show a clear "not available yet" state instead of a fabricated number.
    """
    sorted_assessments = sorted(assessments, key=lambda a: a["date"])
    baseline = sorted_assessments[0]
    latest = sorted_assessments[-1]

    cp_point_yen = None
    if len(sorted_assessments) >= 2 and latest.get("type") == baseline.get("type"):
        score_gain = latest.get("score", 0) - baseline.get("score", 0)
        if score_gain > 0:
            cp_point_yen = round(total_invested_yen / score_gain, 2)

    cefr_level_up = None
    if len(sorted_assessments) >= 2 and latest.get("cefr_overall") != baseline.get("cefr_overall"):
        cefr_level_up = {
            "from": baseline.get("cefr_overall"),
            "to": latest.get("cefr_overall"),
            "total_yen": total_invested_yen,
            "total_hours": round(total_hours, 2)
        }

    return {
        "assessments": sorted_assessments,
        "score_type": latest.get("type"),
        "baseline_score": baseline.get("score"),
        "latest_score": latest.get("score"),
        "cp_point_yen": cp_point_yen,
        "cefr_level_up": cefr_level_up
    }


def build_data():
    today = date(2026, 9, 21) # Baseline project start
    try:
        current_today = date.today()
        if current_today >= START_DATE:
            today = current_today
    except Exception:
        pass

    days_total = (TARGET_DATE - START_DATE).days
    days_elapsed = max(1, (today - START_DATE).days + 1)
    days_remaining = max(0, (TARGET_DATE - today).days)

    log_data = parse_logs()
    vocab_data = parse_vocabulary()
    reading_data = parse_reading_notes()
    roi_data = compute_roi(log_data, today)
    assessments = load_assessments()
    output_roi_data = compute_output_roi(assessments, roi_data["total_invested_yen"], log_data["total_hours"])

    total_hours = log_data["total_hours"]
    progress_pct = round((total_hours / TARGET_HOURS) * 100, 2)
    remaining_hours = max(0.0, TARGET_HOURS - total_hours)
    required_daily_pace = round(remaining_hours / max(1, days_remaining), 2)

    # Current phase determination
    current_phase_id = 1
    for p in PHASES:
        if p["hours_range"][0] <= total_hours < p["hours_range"][1]:
            current_phase_id = p["id"]
            break
    if total_hours >= 5000:
        current_phase_id = 4

    dashboard_data = {
        "project": {
            "name": "English 5,000 Hours Mastery Project",
            "start_date": START_DATE.isoformat(),
            "target_date": TARGET_DATE.isoformat(),
            "target_hours": TARGET_HOURS,
            "total_days": days_total,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "baseline": {
            "start_date": "2026-09-21",
            "toeic": 420,
            "cefr_overall": "B1 low",
            "assessment_source": "CEST Speaking Assessment (2025-05-26)",
            "skills": {
                "vocabulary": {"level": "B1 high", "score": "Active: 1,200 / Passive: 2,500"},
                "grammar": {"level": "B1 mid", "note": "Priority: perfect tenses, passive voice, and reported speech"},
                "pronunciation": {"level": "A2 high", "note": "Priority: intonation, stress patterns, and connected speech"},
                "fluency": {"level": "A2 low", "note": "Priority: increase output volume to reduce pauses and hesitation"},
                "coherence": {"level": "A2 low", "note": "Priority: transition from simple conjunctions to rich discourse markers"}
            },
            "target_goal": "CEFR C1〜C2 / TOEIC 900+ (Professional fluency & equal debate)"
        },

        "stats": {

            "total_hours": total_hours,
            "remaining_hours": round(remaining_hours, 2),
            "progress_percent": progress_pct,
            "current_phase_id": current_phase_id,
            "daily_pace_required": required_daily_pace,
            "daily_target_baseline": 3.3,
            "category_hours": log_data["category_hours"],
            "vocabulary_count": vocab_data["count"],
            "reading_notes_count": reading_data["count"]
        },
        "phases": PHASES,
        "monthly": log_data["monthly_records"],
        "daily": log_data["daily_records"],
        "vocabulary": vocab_data["items"],
        "reading_notes": reading_data["items"],
        "costs": roi_data.pop("_costs_config", {"currency": "JPY", "subscriptions": [], "one_time": []}),
        "roi": roi_data,
        "output_roi": output_roi_data
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

    print(f"Data built successfully: {total_hours} hrs logged. Output saved to data.json.")
    return dashboard_data

if __name__ == "__main__":
    build_data()
