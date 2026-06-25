"""Pydantic models that double as OpenAI structured-output JSON schemas.

These describe exactly what we ask the LLM to return for each of the three
generation calls kicked off by POST /clients/{id}/generate-profile. They are
also used to validate the parsed response before it's persisted.
"""

from pydantic import BaseModel, ConfigDict, Field

# extra="forbid" is required on every one of these models (including nested
# ones) so Pydantic's model_json_schema() emits "additionalProperties": false,
# which OpenAI's structured-output "strict" mode requires at every object level.
_STRICT = ConfigDict(extra="forbid")


# ─────────────────────────────────────────────────────────────────────────────
# Shared primitive
# ─────────────────────────────────────────────────────────────────────────────

class ObjectionNote(BaseModel):
    model_config = _STRICT
    objection: str
    recommended_response: str


# ─────────────────────────────────────────────────────────────────────────────
# Client Profile — structured sub-objects
# ─────────────────────────────────────────────────────────────────────────────

class ProductFAB(BaseModel):
    model_config = _STRICT
    product_name: str = Field(description="Name of the product or service from the documents")
    feature: str = Field(description="What it IS or HAS — the technical fact (F in FAB)")
    advantage: str = Field(description="What the feature DOES — the functional result (A in FAB)")
    benefit: str = Field(description=(
        "What this MEANS to the buyer — resolved to Time, Money, or People terms (B in FAB). "
        "Use the IS→DOES→MEANS formula. Never leave this blank."
    ))
    business_driver: str = Field(description=(
        "3WM+M classification: one of 'Revenue↑', 'Cost↓', 'Risk Mitigation', or 'Mission'. "
        "Tag the dominant business driver this product/feature addresses."
    ))


class StakeholderEntry(BaseModel):
    model_config = _STRICT
    role_title: str = Field(description=(
        "The job title or role (e.g. 'Purchase Manager', 'Plant Head', 'MD/Owner'). "
        "Use document data if available; use role description if name is not known."
    ))
    stakeholder_type: str = Field(description=(
        "One of: 'Initiator' (raises the need), 'Technical Evaluator' (assesses fit), "
        "'Economic Buyer' (signs the PO), 'Blocker' (can kill the deal), "
        "or 'Champion' (internal advocate who wins when we win)."
    ))
    negotiator_type: str = Field(description=(
        "Voss negotiator classification: 'Analyst' (data-driven, needs time, hates surprises), "
        "'Accommodator' (relationship-first, may over-commit, hides objections), "
        "'Assertive' (time=money, direct, wants to win), or 'Unknown'."
    ))
    power_level: str = Field(description="One of: 'High', 'Medium', or 'Low' — their actual decision authority.")
    win_condition: str = Field(description=(
        "What this person personally gains if the deal goes through. "
        "Voss principle: a true Champion must WIN when you win. "
        "If their win is unclear, they are a contact, not a champion."
    ))
    conversation_opener: str = Field(description=(
        "One-line opening script tailored to this role and negotiator type. "
        "Must be a 'What' or 'How' question — never a pitch, never closed-ended."
    ))
    watch_out_for: str = Field(description=(
        "The specific risk or red flag with this stakeholder. "
        "For Blockers: their real motivation for blocking (they fear looking incompetent). "
        "For Accommodators: what objection they are hiding to avoid conflict. "
        "For Analysts: what surprise could derail the deal."
    ))


class DiscoveryQuestion(BaseModel):
    model_config = _STRICT
    category: str = Field(description=(
        "Question category: 'Situation' (opening, establish context), "
        "'Problem' (surface pain and cost of inaction), "
        "'Implication' (uncover downstream impact and behind-the-table dynamics), "
        "'Urgency' (identify real vs. artificial deadline), or 'Commitment' (post-agreement validation)."
    ))
    question: str = Field(description=(
        "The exact question text. MUST start with 'What' or 'How' — NEVER 'Why' (accusatory in any language). "
        "Must be an open, calibrated question that gives the prospect the illusion of control. "
        "Tailored to this specific client's industry and buyer roles."
    ))
    purpose: str = Field(description=(
        "What intelligence this question unlocks — one short sentence. "
        "E.g. 'Surfaces the real internal deadline', 'Identifies hidden stakeholders via pronoun shift', "
        "'Quantifies the cost of doing nothing (R0 in DNI analysis)'."
    ))


class ObjectionBattleCard(BaseModel):
    model_config = _STRICT
    objection: str = Field(description="The prospect's exact words — the objection as they would say it.")
    accusation_audit: str = Field(description=(
        "The Voss Accusation Audit pre-empt — say this BEFORE the prospect raises the objection. "
        "Format: 'It seems like [the concern or doubt]...' "
        "This takes the sting out before it lands. The counterpart cannot attack a negative you've already claimed."
    ))
    calibrated_response: str = Field(description=(
        "The Voss calibrated response — starts with 'What' or 'How', NEVER closed-ended, NEVER 'Why'. "
        "Must NOT split the difference on price. Must NOT attack competitors. "
        "Must give the prospect the illusion of control while guiding them toward your solution."
    ))
    recovery_question: str = Field(description=(
        "The follow-up 'How' question to confirm the objection is resolved. "
        "Applies the Voss Rule of Three — this is the second or third confirmation of commitment. "
        "E.g. 'How does that work for your team?' / 'What do we do if we run into that issue?'"
    ))


class CompetitorEntry(BaseModel):
    model_config = _STRICT
    competitor_name: str = Field(description=(
        "Competitor name. ONLY include competitors explicitly mentioned in the uploaded documents. "
        "Never invent or assume competitor names."
    ))
    why_prospects_choose_them: str = Field(description=(
        "Specific reasons prospects choose this competitor over this client. "
        "Be precise: price? delivery speed? brand recognition? existing relationship? technical superiority?"
    ))
    where_this_client_wins: str = Field(description=(
        "This client's genuine edge over this competitor — specific and honest. "
        "What objectively gives this client the advantage in a head-to-head evaluation?"
    ))
    battle_card_response: str = Field(description=(
        "One-line SE response for when a prospect says 'we already use [this competitor]'. "
        "Use Voss Inverted Why: 'Why would you ever change from [X]? They're probably great. "
        "What made you take this call at all?' — forces them to argue your case."
    ))
    recommended_strategy: str = Field(description=(
        "Care's competitive strategy for this competitor: "
        "'Frontal' (clear superiority — heavy SE presence), "
        "'Flanking' (add a new KBI in discovery that shifts evaluation criteria), "
        "'Fragment' (win one department first), "
        "'Defend' (protect install base), or 'Develop' (invest for future opportunity)."
    ))


# ─────────────────────────────────────────────────────────────────────────────
# Client Profile — main model
# ─────────────────────────────────────────────────────────────────────────────

class GeneratedClientProfile(BaseModel):
    model_config = _STRICT

    # ── Narrative sections (markdown) ─────────────────────────────────────────

    company_snapshot: str = Field(description=(
        "Section 1 — Company Snapshot. Rich markdown narrative. Extract ONLY what is in documents. "
        "Fields: Company Name, Tagline/Brand Positioning, Website(s), Industry, Sub-Industry, "
        "Founded Year, History & Key Milestones, Employee Count, Annual Turnover Band, HQ Location, "
        "Plant/Factory Locations, Branch/Office Locations, Ownership Type (founder-led/PE/listed), "
        "Group Companies/Sister Concerns, Key Leadership (Name + Designation), "
        "Awards & Recognition, LinkedIn URL, YouTube URL, Social Media Links. "
        "End with 'SE Ice-Breaker': one notable achievement the SE can open the first meeting with. "
        "CRITICAL: Completely OMIT any field not found in documents. No placeholders."
    ))

    offer_and_products: str = Field(description=(
        "Section 2 — Offer & Products. Rich markdown narrative. "
        "All FAB chains are captured separately in the product_fab_chains structured field — "
        "this section provides the full product context: Primary Product/Service (1-liner), "
        "Core Problem it Eliminates (buyer-language), Full Product/Service List with Categories, "
        "Specifications Table (markdown table — grade/size/material per product), "
        "Applications per Product (industry × use-case mapping), "
        "Standards & Compliance (IS/ASTM/DIN/BIS etc.), Custom/EPC Capability, "
        "New/Upcoming Products, Price Positioning (premium/mid/budget), "
        "Why Clients Leave/Don't Return. "
        "End with 'IVR Trigger': one industry-specific pain statement to open with. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    ideal_buyer_profile: str = Field(description=(
        "Section 3 — Ideal Buyer Profile. Rich markdown narrative. "
        "Fields: Best Margin Segment, Fastest Converting Segment, Ideal Client Size, "
        "Designations to Target (Initiator → Evaluator → Economic Buyer), "
        "Segments with Most Repeat Orders, Segments to Avoid (and why), "
        "Primary Geographies, Secondary/Emerging Geographies, Average Sales Cycle Length. "
        "End with 'ICP Qualifier': 5 yes/no questions the SE asks to confirm a real opportunity. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    buyer_committee: str = Field(description=(
        "Section 4 — Buyer Committee. Rich markdown narrative. "
        "Stakeholder details are captured separately in the stakeholder_map structured field — "
        "this section provides the full committee context: who initiates, who evaluates, "
        "who signs, who blocks, approval layers, typical First Contact to PO timeline. "
        "Apply Voss pronoun power signals: I/me = less power; we/they = hidden stakeholders; "
        "deflects to committee/boss = cannot close alone. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    competitor_intelligence: str = Field(description=(
        "Section 5 — Competitor Intelligence. Rich markdown narrative. "
        "Per-competitor battle cards are in the competitor_entries structured field — "
        "this section provides the competitive landscape context: overall competitive positioning, "
        "pricing position vs. competitors, aggression levels, DNI (Do Nothing Inc.) analysis "
        "(R0 = risk of doing nothing vs. R2 = risk of buying — quantify the gap), "
        "and recommended overall competitive posture. "
        "CRITICAL: Never invent competitor names. Completely OMIT any field not in documents."
    ))

    sales_playbook: str = Field(description=(
        "Section 6 — Sales Playbook. Rich markdown narrative — the most critical section. "
        "Discovery questions are in the discovery_questions structured field, "
        "objection handling in the objection_battle_cards structured field. "
        "This section covers: Top Lead Sources (ranked), Who Handles Sales, How Deals Close "
        "(the exact trigger sequence for a PO), Average Touchpoints Before First Response, "
        "Stage Where Deals Stall Most + the Care/Voss fix, Top 3 Deal Loss Reasons + Prevention, "
        "Proof Content That Converts (tagged by sales stage: EARLY/MID/AT OBJECTION/PRE-CLOSE), "
        "Is Field Visit Critical (when to deploy), Cold Outreach Script (No-oriented opener), "
        "4-Touchpoint Follow-Up Sequence (channel + message + Voss timing principle). "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    demand_and_timing: str = Field(description=(
        "Section 7 — Demand & Timing. Rich markdown narrative. "
        "Fields: Purchase Triggers, Demand Type (project/recurring/seasonal/replacement), "
        "Peak Buying Months, Slow Months (relationship-building time — not pushing), "
        "External Signals to Watch. "
        "End with 'Deadline Intelligence': the likely real internal deadline and how to use it offensively. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    commercial_overview: str = Field(description=(
        "Section 8 — Commercial Overview. Rich markdown narrative. "
        "Fields: Average Order Value Range (₹), Average Project Value, Best Margin Segment %, "
        "Enquiry-to-Closure Rate %, Payment Terms, Repeat Order Frequency, Capacity Headroom. "
        "End with 'Value Conversation Anchor': how to frame the first commercial discussion as ROI "
        "using Time-Money-People terms, and the Voss price-pushback response. "
        "CRITICAL: Never fabricate numbers. Completely OMIT any field not in documents."
    ))

    credibility_assets: str = Field(description=(
        "Section 9 — Credibility Assets. Rich markdown narrative. "
        "Fields: Notable Past Projects & Installations, Key Client Names/Logos, Client List, "
        "Certifications (with scope), Export Countries, Website Quality, LinkedIn Status. "
        "Tag each asset with deployment timing: "
        "[EARLY — credibility] / [MID — validation] / [AT OBJECTION — proof] / [PRE-CLOSE — risk reduction]. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    strategy_and_focus: str = Field(description=(
        "Section 10 — Strategy & Focus. Rich markdown narrative. "
        "Fields: Top Priorities for Next 12 Months, Segments to Grow, Segments to Exit, "
        "New Geographies Targeted, Product/Service Expansion Plans. "
        "End with 'MOTM Alignment Statement': 2-3 bullets showing where MOTM maps to this client's "
        "strategic direction — use this to open the first executive meeting. "
        "CRITICAL: Completely OMIT any field not in documents."
    ))

    watchlist_director_notes: str = Field(description=(
        "Section 11 — Watchlist / Director Notes. Red flags, sensitivities, escalation history, "
        "complaint patterns, special handling instructions. "
        "Apply Voss Black Swan lens: note if client seems Ill-Informed / Constrained / has Other Interests. "
        "Return empty string if nothing relevant is found. No heading or filler text."
    ))

    # ── Structured actionable data ────────────────────────────────────────────

    product_fab_chains: list[ProductFAB] = Field(description=(
        "Structured FAB chains for every distinct product or service mentioned in the documents. "
        "One entry per product. Apply IS→DOES→MEANS formula. "
        "Benefit must resolve to Time, Money, or People terms. "
        "Tag business_driver as one of: 'Revenue↑', 'Cost↓', 'Risk Mitigation', 'Mission'. "
        "OMIT any product for which the FAB chain cannot be completed from document data."
    ))

    stakeholder_map: list[StakeholderEntry] = Field(description=(
        "Structured stakeholder map — one entry per distinct buyer role in this client's typical sales cycle. "
        "Apply Voss pronoun signals and negotiator typing. "
        "Classify each as Initiator / Technical Evaluator / Economic Buyer / Blocker / Champion. "
        "A Champion entry must have a specific win_condition — if you cannot identify one, classify as Evaluator. "
        "Generate from document data; if specific names are absent, use role-based entries."
    ))

    discovery_questions: list[DiscoveryQuestion] = Field(description=(
        "Exactly 12 calibrated discovery questions for this client's product and buyer context. "
        "3 Situation + 3 Problem + 2 Implication + 2 Urgency + 2 Commitment. "
        "All must start with 'What' or 'How' — NEVER 'Why'. "
        "Each must have a clear purpose — what intelligence it unlocks. "
        "Ground in this client's specific industry, product, and typical buyer pain."
    ))

    objection_battle_cards: list[ObjectionBattleCard] = Field(description=(
        "Structured battle cards for the 7 most likely objections a MOTM SE will face "
        "when selling TO this client's prospects. "
        "Each card has: the objection (prospect's words), Accusation Audit pre-empt ('It seems like...'), "
        "Voss calibrated response (What/How, never split the difference), "
        "and a recovery/commitment question. "
        "Tailor the objections to this specific product and industry context."
    ))

    competitor_entries: list[CompetitorEntry] = Field(description=(
        "Structured competitor intelligence — one entry per named competitor found in the documents. "
        "If no competitors are named in the documents, return an empty list — do NOT invent names. "
        "Include competitive strategy recommendation per competitor."
    ))

    accusation_audit_labels: list[str] = Field(description=(
        "3-5 preemptive Accusation Audit labels the SE delivers at the START of a meeting, "
        "before any objection is raised. Format: 'It seems like [the concern]...' "
        "Cover: past bad vendor experiences, skepticism about claims, hesitation to change, "
        "price concerns, internal political pressure. "
        "These are said OUT LOUD to disarm resistance before it forms."
    ))

    icp_qualifier_questions: list[str] = Field(description=(
        "Exactly 5 yes/no qualifying questions the SE asks in the first 10 minutes "
        "to confirm the prospect is a real opportunity worth pursuing for this client's product. "
        "Must be quick, conversational, and specific to this ICP. "
        "A 'yes' to 4 or more = pursue. Fewer than 3 = qualify out or deprioritize."
    ))


# ─────────────────────────────────────────────────────────────────────────────
# Study Material
# ─────────────────────────────────────────────────────────────────────────────

class StudyModule(BaseModel):
    model_config = _STRICT
    title: str
    content: str


class Flashcard(BaseModel):
    model_config = _STRICT
    front: str
    back: str


class YoutubeVideo(BaseModel):
    model_config = _STRICT
    title: str = Field(description=(
        "Descriptive title telling engineers what they will learn about the PRODUCT — "
        "e.g. 'Industrial Ball Valve Working Principle Explained'."
    ))
    query: str = Field(description=(
        "YouTube search query about the PRODUCT TYPE or CATEGORY (NOT the company name). "
        "Focus on: how the product works, applications, or selection. "
        "Use exact product terminology from the documents."
    ))


class GeneratedStudyMaterial(BaseModel):
    model_config = _STRICT

    modules: list[StudyModule] = Field(description=(
        "Exactly 13 SE Training Modules — Care + Voss framework. Generate in order: "
        "1) The Four SE Roles (Technical Engineer / Salesperson / Trusted Advisor / Explainer); "
        "2) Product Mastery — FAB Chain (IS→DOES→MEANS) + 3WM+M tagging for every product; "
        "3) Business Value Discovery — Care BVD 4-step process with tailored question bank; "
        "4) Technical Discovery — Input/Process/Output questions + Magic Wand + TAG crime audit; "
        "5) Stakeholder Intelligence — Voss negotiator typing, pronoun signals, champion protocol; "
        "6) Competitive Positioning — DNI analysis (R0 vs R2), 5 competitive strategies; "
        "7) Presentation & Demo Mastery — RM+3KP, attention curve, Demo GPS Roadmap, PUNCH; "
        "8) Objection Handling — Voss Accusation Audit + 10 full objection scripts with LACE close; "
        "9) Negotiation Framework — Three types of Yes, Ackerman model, Black Swan diagnostic, Rule of Three; "
        "10) Follow-Up & Re-Engagement — Non-responder sequence, post-demo questions, deadline-based cadence; "
        "11) POC Management — Care 7 phases + 7 SE habits + success criteria template; "
        "12) Trust & Executive Engagement — CRISP equation, executive wants ranking, opening script; "
        "13) Field Preparation Toolkit — Pre-call One Sheet, Discovery Cheat Sheet, Objection Quick-Reference, Post-call Debrief. "
        "Never skip or merge modules. Each must be thorough."
    ))

    flashcards: list[Flashcard] = Field(description=(
        "Exactly 20 flashcards testing SE competencies: "
        "5 Product Knowledge (specs/features/applications from documents), "
        "5 Discovery Skills (BVD process, calibrated questions, TAG crimes), "
        "5 Stakeholder & Objection (negotiator types, Accusation Audit, objection responses), "
        "5 Value & Negotiation (FAB chain, 3WM+M, Ackerman model, Rule of Three). "
        "Question as 'front', answer as 'back'. Product questions grounded in documents."
    ))

    cheat_sheet: str = Field(description=(
        "Quick-reference cheat sheet in clean markdown: "
        "Top 5 product facts, BVD 4-step sequence, Top 5 calibrated questions, "
        "Negotiator type quick-guide (one line each), DNI loss-framing statement, "
        "Rule of Three checklist, ICP qualifier (5 yes/no questions). Max 2 pages."
    ))

    youtube_videos: list[YoutubeVideo] = Field(description=(
        "Exactly 3 YouTube search queries about the PRODUCT TYPE/CATEGORY — "
        "working principle, applications, or selection process. "
        "Do NOT use company name. Use specific product terminology from documents."
    ))


# ─────────────────────────────────────────────────────────────────────────────
# Sales Pitch
# ─────────────────────────────────────────────────────────────────────────────

class NegotiatorVariant(BaseModel):
    model_config = _STRICT
    negotiator_type: str = Field(description="One of: Analyst, Accommodator, or Assertive")
    opening_adjustment: str = Field(description=(
        "How to adjust the opening for this type. "
        "Analyst: lead with data and preparation signal. "
        "Accommodator: lead with relationship and shared goals. "
        "Assertive: lead with validation of their position before guiding."
    ))
    key_emphasis: str = Field(description=(
        "What to emphasize in the body for this type. "
        "Analyst: specifics, comparisons, processing time. "
        "Accommodator: team impact, win-win framing. "
        "Assertive: speed, results, competitive advantage."
    ))
    close_approach: str = Field(description=(
        "How to close with this type. "
        "Analyst: give time; use precise non-round numbers; warn of issues early. "
        "Accommodator: use How questions to drive from agreement to action. "
        "Assertive: let them feel they won; Ackerman decreasing increments."
    ))


class GeneratedSalesPitch(BaseModel):
    model_config = _STRICT

    accusation_audit: list[str] = Field(description=(
        "3-5 preemptive Accusation Audit labels the SE says OUT LOUD before any objection arises. "
        "Format: 'It seems like [the concern]...' "
        "Cover: past bad vendor experiences, price concerns, skepticism, hesitation to change, internal politics."
    ))

    opening: str = Field(description=(
        "Pitch opening using Care's PUNCH (Personal/Unexpected/Novel/Challenge/Humor) + Voss Accusation Audit. "
        "Start with the customer's world, not the product. Show the end result first (Baked Cake Principle). "
        "Apply loss-aversion: what they LOSE by staying with the status quo. "
        "Do NOT start with a corporate overview."
    ))

    key_value_props: list[str] = Field(description=(
        "5-7 value propositions, each a complete FAB Chain: "
        "Feature (IS) → Advantage (DOES) → Benefit (MEANS to buyer in Time/Money/People terms). "
        "Tag each with 3WM+M: Revenue↑ / Cost↓ / Risk / Mission. "
        "At least 2 must use Voss loss-aversion: what they LOSE by not choosing this product."
    ))

    objection_responses: list[ObjectionNote] = Field(description=(
        "7-10 objection scripts. objection = prospect's words. "
        "recommended_response = Accusation Audit pre-empt + What/How calibrated response + LACE close. "
        "Never split the difference on price. Never attack competitors. "
        "Cover: existing vendor, price too high, no budget, need to think, committee approval, "
        "gone silent, not ready, competitor comparison, bad past experience."
    ))

    closing: str = Field(description=(
        "Fantastic Finish (Care) + Rule of Three (Voss). "
        "End on the Residual Message — the single most powerful benefit. "
        "Three confirmations: (1) direct agreement, (2) label/summary until 'That's right', "
        "(3) How implementation question. "
        "End with: 'How are we going to make this happen on your side?' "
        "NEVER end with 'Any questions?' or 'Thank you.'"
    ))

    non_responder_email: str = Field(description=(
        "One-sentence Voss non-responder email for when the prospect goes silent. "
        "Must use loss-aversion and No-oriented framing. "
        "Format: 'Have you given up on [specific initiative from client context]?' "
        "One sentence. No greeting. No context."
    ))

    negotiator_variants: list[NegotiatorVariant] = Field(description=(
        "Exactly 3 pitch adaptation guides — one per Voss negotiator type: "
        "Analyst, Accommodator, Assertive."
    ))
