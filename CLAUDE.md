# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-development. No source code, build tooling, or tests exist yet. The only artifact is the design mock `Suki Points — all-branch dashboard.pdf`, which is the reference spec for the web app. When a stack is chosen and scaffolded, replace this section with real build/lint/test commands.

Remote: https://github.com/natzkieboy23/yulito-suki-card-webapp.git

## What the app is

"Suki Points" — a loyalty-card (suki card) points dashboard for Yulito Pharmacy, covering 5 branches. All figures in the mock are sample data; the footer states the app must connect to the POS / suki card database to go live. Currency is PHP (₱), with 1 point = ₱1.00 rewards value.

## Dashboard spec (from the PDF mock)

Global controls: period toggle (Week / Month / Year), Export button, branch scope chip ("All 5 branches"). Selecting a branch in "Branch race" focuses the **whole dashboard** on that branch, so every widget must accept a branch filter + period.

Widgets:
- **KPI cards** (each with sparkline + delta badge): Points issued, Points redeemed (redemption rate; healthy range 30–50% of issued), Active sukis (≥1 purchase in period), Unredeemed balance (points liability in ₱, "Watch" flag).
- **Branch race**: branches ranked by points earned; per branch: active sukis, pts per visit, % of all points, change vs previous period.
- **Tier ladder**: tiers by yearly points — Platinum 12,000+, Gold 5,000–11,999, Silver 1,500–4,999, Regular <1,500 (labelled "suggested thresholds", so keep configurable). Count and % per tier.
- **Points expiring in 30 days**: ₱ value + number of sukis; "Send expiry reminder SMS" action.
- **Top sukis**: ranked by points earned in period, filterable by branch; top 3 as cards, rest in table with branch, tier, points, visits, weekly visit streak, progress % to next tier. Card numbers shown masked (`•••• 1234`).
- **Refill radar**: maintenance-medication sukis due this week, days until due, "Remind" action; 2× points if refilled on time.
- **Win-back list**: high-value sukis with no visit in 45+ days, lifetime points, "we miss you" 2× points offer action.
- **When sukis earn**: heatmap of points earned by weekday × 2-hour slot (8 AM–8 PM), with a generated insight naming the peak and quietest slot (suggests a "2× Suki Hour").
- **Most-claimed rewards**: redemptions in period per reward with its points cost.

Implied domain entities: branch, suki (member/card), tier, transaction/visit (points earned), redemption, reward catalog, points expiry, maintenance-medication refill schedule, SMS outreach.

Member data (names, card numbers, medication refill info) is customer health-adjacent PII — mask card numbers in UI as the mock does.
